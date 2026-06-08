import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { KMS } from '@/lib/kms'
import { InitializeVaultBodySchema } from '@/lib/vault-types'
import crypto from 'crypto'

export async function POST(request: Request) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const result = InitializeVaultBodySchema.safeParse(body)
    if (!result.success) {
        return NextResponse.json({ error: 'Invalid request body', details: result.error.issues }, { status: 400 })
    }

    const {
        user_id,
        recovery_token_wrapped_key,
        sse_kms_asymmetrically_wrapped_key,
        verification_token,
    } = result.data

    if (user_id !== session!.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Lock the user row to serialize concurrent initialization attempts
            await tx.$executeRaw`SELECT 1 FROM "User" WHERE id = ${user_id} FOR UPDATE`

            const existingKeyCount = await tx.userWrappedVaultKeys.count({
                where: { userId: user_id },
            })
            if (existingKeyCount > 0) {
                const err = new Error('Vault already initialized for this user') as any
                err.statusCode = 409
                throw err
            }

            await tx.userWrappedVaultKeys.create({
                data: {
                    userId: user_id,
                    wrapMode: 'RECOVERY_TOKEN',
                    wrappedKey: recovery_token_wrapped_key,
                },
            })

            if (sse_kms_asymmetrically_wrapped_key) {
                const wrappedKey = await KMS.wrapMasterKey(sse_kms_asymmetrically_wrapped_key)
                await tx.userWrappedVaultKeys.create({
                    data: {
                        userId: user_id,
                        wrapMode: 'SSE_KMS',
                        wrappedKey,
                    },
                })
            }

            const masterKeyHash = crypto
                .createHash('sha256')
                .update(Buffer.from(verification_token, 'base64'))
                .digest('base64')

            await tx.user.update({
                where: { id: user_id },
                data: { masterKeyHash },
            })
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        const status = err.statusCode ?? 500
        return NextResponse.json({ error: 'Request failed' }, { status })
    }
}
