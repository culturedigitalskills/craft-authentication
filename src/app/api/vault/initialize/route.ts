import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { KMS } from '@/lib/kms'
import crypto from 'crypto'

export async function POST(request: Request) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const body = await request.json()
        const {
            user_id,
            recovery_token_wrapped_key,
            sse_kms_asymmetrically_wrapped_key,
            prf_wrapped_key,
            credential_id,
            verification_token,
        } = body

        if (user_id !== session!.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (!recovery_token_wrapped_key) {
            return NextResponse.json(
                { error: 'Missing recovery_token_wrapped_key' },
                { status: 400 }
            )
        }

        if (!verification_token) {
            return NextResponse.json(
                { error: 'Missing verification_token' },
                { status: 400 }
            )
        }

        // Run setup inside a transaction for atomicity
        await prisma.$transaction(async (tx) => {
            // 1. Store Recovery Token row
            await tx.userWrappedVaultKeys.create({
                data: {
                    userId: user_id,
                    wrapMode: 'RECOVERY_TOKEN',
                    wrappedKey: recovery_token_wrapped_key,
                },
            })

            // 2. If Server Escrow (SSE_KMS) is provided
            if (sse_kms_asymmetrically_wrapped_key) {
                const wrappedKey = await KMS.wrapMasterKey(sse_kms_asymmetrically_wrapped_key)
                await tx.userWrappedVaultKeys.create({
                    data: {
                        userId: user_id,
                        wrapMode: 'SSE_KMS',
                        wrappedKey: wrappedKey,
                    },
                })
            }

            // 3. If Passkey (E2E_PRF) wrapper is provided
            if (prf_wrapped_key && credential_id) {
                const serverSecret = process.env.VAULT_SERVER_SECRET || process.env.AUTH_SECRET || 'default_secret'
                const credentialIdHash = crypto
                    .createHmac('sha256', serverSecret)
                    .update(credential_id)
                    .digest('base64')

                await tx.userWrappedVaultKeys.create({
                    data: {
                        userId: user_id,
                        wrapMode: 'E2E_PRF',
                        wrappedKey: prf_wrapped_key,
                        credentialId: credentialIdHash,
                    },
                })
            }

            // 4. Update the user's masterKeyHash = SHA-256(verification_token)
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
        return NextResponse.json(
            { error: err.message || 'Initialization failed' },
            { status: 500 }
        )
    }
}
