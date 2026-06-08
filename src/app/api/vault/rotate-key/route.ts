import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { KMS } from '@/lib/kms'
import { getVaultServerSecret } from '@/lib/vault-config'
import crypto from 'crypto'

export async function POST(request: Request) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const userId = session!.user.id

    try {
        const body = await request.json()
        const {
            new_recovery_token_wrapped_key,
            new_prf_wrapped_key,
            new_sse_kms_asymmetrically_wrapped_key,
            credential_id,
            re_encrypted_secrets,
            verification_token,
            new_verification_token,
        } = body

        if (!new_recovery_token_wrapped_key) {
            return NextResponse.json({ error: 'Missing new_recovery_token_wrapped_key' }, { status: 400 })
        }

        if (!verification_token) {
            return NextResponse.json({ error: 'Missing verification_token' }, { status: 400 })
        }

        // A true key rotation re-encrypts secrets under a new MasterVaultKey and must
        // supply a new_verification_token derived from that new key.
        const secretsProvided = Array.isArray(re_encrypted_secrets) && re_encrypted_secrets.length > 0
        if (secretsProvided && !new_verification_token) {
            return NextResponse.json(
                { error: 'new_verification_token is required when re_encrypted_secrets are provided' },
                { status: 400 }
            )
        }

        await prisma.$transaction(async (tx) => {
            // Lock all affected rows to prevent concurrent key rotation or initialization
            await tx.$executeRaw`SELECT 1 FROM "User" WHERE id = ${userId} FOR UPDATE`
            await tx.$executeRaw`SELECT 1 FROM "UserWrappedVaultKeys" WHERE user_id = ${userId} FOR UPDATE`
            await tx.$executeRaw`SELECT 1 FROM "UserSecrets" WHERE user_id = ${userId} FOR UPDATE`

            // Re-read masterKeyHash inside the transaction to avoid TOCTOU
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { masterKeyHash: true },
            })

            if (!user?.masterKeyHash) {
                const err = new Error('Vault not initialized') as any
                err.statusCode = 400
                throw err
            }

            const calculatedHash = crypto
                .createHash('sha256')
                .update(Buffer.from(verification_token, 'base64'))
                .digest('base64')

            if (calculatedHash !== user.masterKeyHash) {
                const err = new Error('Invalid verification token') as any
                err.statusCode = 401
                throw err
            }

            // Replace all wrapped keys
            await tx.userWrappedVaultKeys.deleteMany({ where: { userId } })

            await tx.userWrappedVaultKeys.create({
                data: {
                    userId,
                    wrapMode: 'RECOVERY_TOKEN',
                    wrappedKey: new_recovery_token_wrapped_key,
                },
            })

            if (new_sse_kms_asymmetrically_wrapped_key) {
                const wrappedKey = await KMS.wrapMasterKey(new_sse_kms_asymmetrically_wrapped_key)
                await tx.userWrappedVaultKeys.create({
                    data: { userId, wrapMode: 'SSE_KMS', wrappedKey },
                })
            }

            if (new_prf_wrapped_key && credential_id) {
                const credentialIdHash = crypto
                    .createHmac('sha256', getVaultServerSecret())
                    .update(credential_id)
                    .digest('base64')

                await tx.userWrappedVaultKeys.create({
                    data: {
                        userId,
                        wrapMode: 'E2E_PRF',
                        wrappedKey: new_prf_wrapped_key,
                        credentialId: credentialIdHash,
                    },
                })
            }

            // Replace all secrets — delete then re-insert so orphaned secrets (encrypted
            // with the old key and omitted from the rotation) never silently persist.
            await tx.userSecrets.deleteMany({ where: { userId } })

            if (secretsProvided) {
                for (const secret of re_encrypted_secrets) {
                    await tx.userSecrets.create({
                        data: {
                            userId,
                            type: secret.type,
                            ciphertextData: secret.ciphertext_data,
                        },
                    })
                }
            }

            // Update masterKeyHash to reflect the new verification token.
            // If no new token is supplied (re-wrap without changing the key), the old hash
            // is preserved — verification_token still matches the stored MasterVaultKey.
            const tokenForHash = new_verification_token ?? verification_token
            const newMasterKeyHash = crypto
                .createHash('sha256')
                .update(Buffer.from(tokenForHash, 'base64'))
                .digest('base64')

            await tx.user.update({
                where: { id: userId },
                data: { masterKeyHash: newMasterKeyHash },
            })
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        const status = err.statusCode ?? 500
        return NextResponse.json(
            { error: err.message || 'Key rotation failed' },
            { status }
        )
    }
}
