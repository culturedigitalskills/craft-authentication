import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const count = await prisma.userWrappedVaultKeys.count({
            where: { userId: session!.user.id },
        })

        return NextResponse.json({ initialized: count > 0 })
    } catch {
        return NextResponse.json({ error: 'Failed to retrieve vault status' }, { status: 500 })
    }
}
