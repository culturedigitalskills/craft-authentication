import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'

export async function DELETE() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const userId = session!.user.id

    try {
        await prisma.$transaction(async (tx) => {
            // Lock the wrapped keys rows for this user to prevent concurrent modifications
            await tx.$executeRaw`
                SELECT 1 FROM "UserWrappedVaultKeys" 
                WHERE user_id = ${userId} 
                FOR UPDATE
            `

            // Check if there is at least one E2E_PRF wrapper registered
            const e2eCount = await tx.userWrappedVaultKeys.count({
                where: {
                    userId: userId,
                    wrapMode: 'E2E_PRF',
                },
            })

            if (e2eCount === 0) {
                throw new Error('Cannot delete escrow: no E2E_PRF record exists.')
            }

            // Delete the SSE_KMS row
            await tx.userWrappedVaultKeys.deleteMany({
                where: {
                    userId: userId,
                    wrapMode: 'SSE_KMS',
                },
            })
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Failed to delete KMS escrow' },
            { status: 400 }
        )
    }
}
