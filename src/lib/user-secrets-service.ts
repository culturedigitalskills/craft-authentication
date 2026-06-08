import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { KMS } from '@/lib/kms'

/**
 * Decrypts a client-encrypted GCM ciphertext using the raw MasterVaultKey.
 * Expects a JSON string with base64 encoded 'ciphertext' (which includes the 16-byte GCM tag at the end) and 'iv'.
 */
export function decryptPayloadServer(ciphertextJson: string, masterKey: Uint8Array): string {
    const { ciphertext, iv } = JSON.parse(ciphertextJson)
    const ivBuffer = Buffer.from(iv, 'base64')
    const combined = Buffer.from(ciphertext, 'base64')

    if (combined.length < 16) {
        throw new Error('Invalid ciphertext payload size')
    }

    const ciphertextBuffer = combined.subarray(0, combined.length - 16)
    const tagBuffer = combined.subarray(combined.length - 16)

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(masterKey), ivBuffer)
    decipher.setAuthTag(tagBuffer)

    const decrypted = Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()])
    return decrypted.toString('utf8')
}

export class UserSecretsService {
    /**
     * Retrieves and decrypts a specific user secret on the server.
     * 
     * - If providedMasterKey is passed, it uses it directly.
     * - Otherwise, it attempts to fetch the SSE_KMS wrapped MasterVaultKey from the database,
     *   unwraps it using the server KMS adapter, and decrypts the secret.
     * - If SSE_KMS is disabled and no key is provided, throws an error (since the server is locked out).
     */
    static async getDecryptedSecret(
        userId: string,
        secretType: string,
        providedMasterKey?: Uint8Array
    ): Promise<string> {
        let masterKey: Uint8Array

        if (providedMasterKey) {
            masterKey = providedMasterKey
        } else {
            // Attempt to retrieve and unwrap via KMS
            const sseKmsRecord = await prisma.userWrappedVaultKeys.findFirst({
                where: { userId, wrapMode: 'SSE_KMS' },
            })
            
            if (!sseKmsRecord) {
                throw new Error(
                    'KMS Escrow is disabled for this user. The client must supply the MasterVaultKey to execute server-side tasks.'
                )
            }

            masterKey = await KMS.unwrapMasterKey(sseKmsRecord.wrappedKey)
        }

        // Retrieve the encrypted secret record
        const secretRecord = await prisma.userSecrets.findFirst({
            where: { userId, type: secretType },
        })

        if (!secretRecord) {
            throw new Error(`Secret of type '${secretType}' not found for user '${userId}'.`)
        }

        // Decrypt using the master key
        const plaintext = decryptPayloadServer(secretRecord.ciphertextData, masterKey)

        // Wipe sensitive key from memory
        if (!providedMasterKey) {
            // If we unwrapped it locally, clean it up
            Buffer.from(masterKey).fill(0)
        }

        return plaintext
    }
}
