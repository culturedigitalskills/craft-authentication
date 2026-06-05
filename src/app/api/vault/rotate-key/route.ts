import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { KMS } from '@/lib/kms'
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
            return NextResponse.json(
                { error: 'Missing new_recovery_token_wrapped_key' },
                { status: 400 }
            )
        }

        if (!verification_token) {
            return NextResponse.json(
                { error: 'Missing verification_token' },
                { status: 400 }
            )
        }

        // 1. Verify verification_token against stored masterKeyHash
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { masterKeyHash: true },
        })

        if (!user || !user.masterKeyHash) {
            return NextResponse.json(
                { error: 'Vault not initialized or hash not found' },
                { status: 400 }
            )
        }

        const calculatedHash = crypto
            .createHash('sha256')
            .update(Buffer.from(verification_token, 'base64'))
            .digest('base64')

        if (calculatedHash !== user.masterKeyHash) {
            return NextResponse.json(
                { error: 'Invalid verification token' },
                { status: 401 }
            )
        }

        // 2. Perform rotation atomically
        await prisma.$transaction(async (tx) => {
            // Locking rows to prevent TOCTOU race conditions
            await tx.$executeRaw`SELECT 1 FROM "User" WHERE id = ${userId} FOR UPDATE`
            await tx.$executeRaw`SELECT 1 FROM "UserWrappedVaultKeys" WHERE user_id = ${userId} FOR UPDATE`
            await tx.$executeRaw`SELECT 1 FROM "UserSecrets" WHERE user_id = ${userId} FOR UPDATE`

            // Delete existing wrapped keys
            await tx.userWrappedVaultKeys.deleteMany({
                where: { userId },
            })

            // Save new Recovery Token row
            await tx.userWrappedVaultKeys.create({
                data: {
                    userId: userId,
                    wrapMode: 'RECOVERY_TOKEN',
                    wrappedKey: new_recovery_token_wrapped_key,
                },
            })

            // Save new KMS row if provided
            if (new_sse_kms_asymmetrically_wrapped_key) {
                const wrappedKey = await KMS.wrapMasterKey(new_sse_kms_asymmetrically_wrapped_key)
                await tx.userWrappedVaultKeys.create({
                    data: {
                        userId: userId,
                        wrapMode: 'SSE_KMS',
                        wrappedKey: wrappedKey,
                    },
                })
            }

            // Save new E2E_PRF row if provided
            if (new_prf_wrapped_key && credential_id) {
                const serverSecret = process.env.VAULT_SERVER_SECRET || process.env.AUTH_SECRET || 'default_secret'
                const credentialIdHash = crypto
                    .createHmac('sha256', serverSecret)
                    .update(credential_id)
                    .digest('base64')

                await tx.userWrappedVaultKeys.create({
                    data: {
                        userId: userId,
                        wrapMode: 'E2E_PRF',
                        wrappedKey: new_prf_wrapped_key,
                        credentialId: credentialIdHash,
                    },
                })
            }

            // Save all re-encrypted secrets
            if (Array.isArray(re_encrypted_secrets)) {
                for (const secret of re_encrypted_secrets) {
                    await tx.userSecrets.updateMany({
                        where: {
                            id: secret.id,
                            userId: userId,
                        },
                        data: {
                            ciphertextData: secret.ciphertext_data,
                        },
                    })
                }
            }

            // Update masterKeyHash to match the new verification token
            const finalNewVerificationToken = new_verification_token || verification_token
            const newMasterKeyHash = crypto
                .createHash('sha256')
                .update(Buffer.from(finalNewVerificationToken, 'base64'))
                .digest('base64')

            await tx.user.update({
                where: { id: userId },
                data: { masterKeyHash: newMasterKeyHash },
            })
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Key rotation failed' },
            { status: 500 }
        )
    }
}
