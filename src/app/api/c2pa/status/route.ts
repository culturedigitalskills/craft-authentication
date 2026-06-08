import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { getC2PARootKeys } from '@/lib/c2pa-config'

export async function GET() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const userId = session!.user.id

    try {
        // Check if vault is initialized
        const vaultKey = await prisma.userWrappedVaultKeys.findFirst({
            where: { userId, wrapMode: 'SSE_KMS' },
        })
        const vaultInitialized = !!vaultKey

        // Check if C2PA is initialized
        const secrets = await prisma.userSecrets.findMany({
            where: {
                userId,
                type: { in: ['C2PA_PUB', 'C2PA_PRIV'] },
            },
        })
        const c2paInitialized = secrets.length === 2

        // Get user settings
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { c2paAutoRenew: true, c2paCertExpiresAt: true },
        })

        const c2paAutoRenew = user?.c2paAutoRenew ?? false
        const c2paCertExpiresAt = user?.c2paCertExpiresAt ?? null

        let needsRenewal = false
        if (c2paCertExpiresAt) {
            const daysRemaining = (new Date(c2paCertExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            needsRenewal = daysRemaining <= 30
        }

        return NextResponse.json({
            vaultInitialized,
            c2paInitialized,
            c2paAutoRenew,
            c2paCertExpiresAt,
            needsRenewal,
        })
    } catch (error: any) {
        console.error('Error in GET /api/c2pa/status:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
