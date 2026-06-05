import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const wrappedKeys = await prisma.userWrappedVaultKeys.findMany({
            where: { userId: session!.user.id },
            select: {
                id: true,
                wrapMode: true,
                wrappedKey: true,
                credentialId: true,
                createdAt: true,
            },
        })

        return NextResponse.json({ wrappedKeys })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Failed to retrieve wrapped keys' },
            { status: 500 }
        )
    }
}
