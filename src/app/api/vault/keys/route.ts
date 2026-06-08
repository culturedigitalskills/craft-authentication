import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const records = await prisma.userWrappedVaultKeys.findMany({
            where: { userId: session!.user.id },
            select: {
                id: true,
                wrapMode: true,
                wrappedKey: true,
                credentialId: true,
                createdAt: true,
            },
        })

        // The SSE_KMS wrapped key is only ever unwrapped server-side (via KMS).
        // Returning it to the client would expose attack material and serves no client purpose.
        const wrappedKeys = records.map((r) => ({
            id: r.id,
            wrapMode: r.wrapMode,
            wrappedKey: r.wrapMode === 'SSE_KMS' ? undefined : r.wrappedKey,
            credentialId: r.credentialId,
            createdAt: r.createdAt,
        }))

        return NextResponse.json({ wrappedKeys })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Failed to retrieve wrapped keys' },
            { status: 500 }
        )
    }
}
