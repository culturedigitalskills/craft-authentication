import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { KMS } from '@/lib/kms'
import { RotateKeyBodySchema } from '@/lib/vault-types'
import crypto from 'crypto'

export async function POST(request: Request) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const userId = session!.user.id

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const result = RotateKeyBodySchema.safeParse(body)
    if (!result.success) {
        return NextResponse.json({ error: 'Invalid request body', details: result.error.issues }, { status: 400 })
    }

    const {
        new_recovery_token_wrapped_key,
        new_sse_kms_asymmetrically_wrapped_key,
        re_encrypted_secrets,
        verification_token,
        new_verification_token,
    } = result.data

    const secretsProvided = Array.isArray(re_encrypted_secrets) && re_encrypted_secrets.length > 0
    if (secretsProvided && !new_verification_token) {
        return NextResponse.json(
            { error: 'new_verification_token is required when re_encrypted_secrets are provided' },
            { status: 400 }
        )
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT 1 FROM "User" WHERE id = ${userId} FOR UPDATE`
            await tx.$executeRaw`SELECT 1 FROM "UserWrappedVaultKeys" WHERE user_id = ${userId} FOR UPDATE`
            await tx.$executeRaw`SELECT 1 FROM "UserSecrets" WHERE user_id = ${userId} FOR UPDATE`

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

            if (!crypto.timingSafeEqual(
                Buffer.from(calculatedHash, 'base64'),
                Buffer.from(user.masterKeyHash, 'base64')
            )) {
                const err = new Error('Invalid verification token') as any
                err.statusCode = 401
                throw err
            }

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

            // Replace all secrets — delete then re-insert so orphaned secrets (encrypted
            // with the old key and omitted from the rotation) never silently persist.
            await tx.userSecrets.deleteMany({ where: { userId } })

            if (secretsProvided) {
                for (const secret of re_encrypted_secrets!) {
                    await tx.userSecrets.create({
                        data: {
                            userId,
                            type: secret.type,
                            ciphertextData: secret.ciphertext_data,
                        },
                    })
                }
            }

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
            { error: status === 401 ? 'Unauthorized' : 'Request failed' },
            { status }
        )
    }
}
