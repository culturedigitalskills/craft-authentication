'use server'

import { prisma } from '@/lib/prisma'
import { KMS } from '@/lib/kms'
import { decryptPayloadServer } from '@/lib/user-secrets-service'
import crypto from 'crypto'

/**
 * Development-only server action to verify that the client-decoded key matches the server-unwrapped escrow key.
 * This is used during development to verify that the client got properly decoded keys.
 */
export async function verifyClientDecodedKeyAction(
    userId: string,
    clientMasterKeyBase64: string
) {
    if (process.env.NODE_ENV !== 'development') {
        throw new Error('This action is only available in development mode')
    }

    try {
        // 1. Fetch the SSE_KMS wrapped vault key from the database
        const sseKmsRecord = await prisma.userWrappedVaultKeys.findFirst({
            where: { userId, wrapMode: 'SSE_KMS' },
        })

        if (!sseKmsRecord) {
            return {
                success: false,
                error: 'No SSE_KMS (server escrow) record found for this user',
            }
        }

        // 2. Unwrap the escrow key using the KMS
        const serverUnwrappedKey = await KMS.unwrapMasterKey(sseKmsRecord.wrappedKey)
        const clientKey = Buffer.from(clientMasterKeyBase64, 'base64')

        // 3. Compare the keys timing-safely
        const keysMatch = serverUnwrappedKey.length === clientKey.length && 
            crypto.timingSafeEqual(serverUnwrappedKey, clientKey)

        // 4. Wipe sensitive key material from memory
        Buffer.from(serverUnwrappedKey).fill(0)

        if (keysMatch) {
            return {
                success: true,
                message: 'Success: Client-supplied vault key matches server-unwrapped escrow key perfectly.',
            }
        } else {
            return {
                success: false,
                error: 'Mismatched keys: client-supplied key does not match server-unwrapped escrow key',
            }
        }
    } catch (err: any) {
        return {
            success: false,
            error: err.message || 'Key verification failed',
        }
    }
}

/**
 * Development-only server action to verify that a client-encrypted secret can be successfully decrypted.
 * Used to verify the E2E and SSE cryptographic pipeline.
 */
export async function verifyDecryptedSecretAction(
    userId: string,
    secretType: string,
    clientMasterKeyBase64?: string
) {
    if (process.env.NODE_ENV !== 'development') {
        throw new Error('This action is only available in development mode')
    }

    try {
        const secretRecord = await prisma.userSecrets.findFirst({
            where: { userId, type: secretType },
        })

        if (!secretRecord) {
            return {
                success: false,
                error: `No secret of type '${secretType}' found for user '${userId}'`,
            }
        }

        let decryptedText: string

        if (clientMasterKeyBase64) {
            // E2E mode / manual verification with client-provided key
            const clientKeyBytes = new Uint8Array(Buffer.from(clientMasterKeyBase64, 'base64'))
            decryptedText = decryptPayloadServer(secretRecord.ciphertextData, clientKeyBytes)
            Buffer.from(clientKeyBytes).fill(0)
        } else {
            // Escrow mode verification
            const sseKmsRecord = await prisma.userWrappedVaultKeys.findFirst({
                where: { userId, wrapMode: 'SSE_KMS' },
            })

            if (!sseKmsRecord) {
                return {
                    success: false,
                    error: 'No server escrow (SSE_KMS) key found. Client must supply the key for decryption.',
                }
            }

            const serverUnwrappedKey = await KMS.unwrapMasterKey(sseKmsRecord.wrappedKey)
            decryptedText = decryptPayloadServer(secretRecord.ciphertextData, serverUnwrappedKey)
            Buffer.from(serverUnwrappedKey).fill(0)
        }

        return {
            success: true,
            decryptedValue: decryptedText,
        }
    } catch (err: any) {
        return {
            success: false,
            error: err.message || 'Secret decryption failed',
        }
    }
}

import { auth } from '@/lib/auth'
import { encryptPayloadServer } from '@/lib/user-secrets-service'

export async function storeOpenRouterApiKeyAction(apiKey: string) {
    const session = await auth()
    if (!session?.user) {
        throw new Error('Not authenticated')
    }
    const userId = session.user.id

    const escrowRecord = await prisma.userWrappedVaultKeys.findFirst({
        where: { userId, wrapMode: 'SSE_KMS' },
    })

    if (!escrowRecord) {
        throw new Error('Vault is not initialized. Please set up your vault first.')
    }

    const masterKey = await KMS.unwrapMasterKey(escrowRecord.wrappedKey)

    try {
        const encryptedKey = encryptPayloadServer(apiKey, masterKey)

        const existing = await prisma.userSecrets.findFirst({
            where: { userId, type: 'OPENROUTER_API_KEY' },
        })

        if (existing) {
            await prisma.userSecrets.update({
                where: { id: existing.id },
                data: { ciphertextData: encryptedKey },
            })
        } else {
            await prisma.userSecrets.create({
                data: {
                    userId,
                    type: 'OPENROUTER_API_KEY',
                    ciphertextData: encryptedKey,
                },
            })
        }
    } finally {
        masterKey.fill(0)
    }

    return { success: true }
}

export async function checkOpenRouterApiKeyAction() {
    const session = await auth()
    if (!session?.user) {
        return { present: false }
    }
    const userId = session.user.id

    const record = await prisma.userSecrets.findFirst({
        where: { userId, type: 'OPENROUTER_API_KEY' },
        select: { id: true },
    })

    return { present: record !== null }
}
