import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import crypto from 'crypto'

export async function DELETE(request: Request) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const userId = session!.user.id

    let verification_token: string | undefined
    try {
        const body = await request.json()
        verification_token = body?.verification_token
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!verification_token) {
        return NextResponse.json({ error: 'Missing verification_token' }, { status: 400 })
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Lock all affected rows to prevent concurrent modifications
            await tx.$executeRaw`SELECT 1 FROM "User" WHERE id = ${userId} FOR UPDATE`
            await tx.$executeRaw`
                SELECT 1 FROM "UserWrappedVaultKeys"
                WHERE user_id = ${userId}
                FOR UPDATE
            `

            // Verify the caller knows the MasterVaultKey before destroying the escrow row
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
                .update(Buffer.from(verification_token!, 'base64'))
                .digest('base64')

            if (!crypto.timingSafeEqual(
                Buffer.from(calculatedHash, 'base64'),
                Buffer.from(user.masterKeyHash, 'base64')
            )) {
                const err = new Error('Invalid verification token') as any
                err.statusCode = 401
                throw err
            }

            // Check if there is at least one E2E_PRF wrapper registered
            const e2eCount = await tx.userWrappedVaultKeys.count({
                where: { userId, wrapMode: 'E2E_PRF' },
            })

            if (e2eCount === 0) {
                const err = new Error('Cannot delete escrow: no E2E_PRF record exists.') as any
                err.statusCode = 400
                throw err
            }

            // Delete the SSE_KMS row
            await tx.userWrappedVaultKeys.deleteMany({
                where: { userId, wrapMode: 'SSE_KMS' },
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
