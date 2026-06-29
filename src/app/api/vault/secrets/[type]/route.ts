import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { SecretTypeSchema } from '@/lib/vault-types'

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ type: string }> }
) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const { type: rawType } = await params
    const result = SecretTypeSchema.safeParse(rawType)
    if (!result.success) {
        return NextResponse.json({ error: `Unknown secret type: ${rawType}` }, { status: 400 })
    }

    try {
        const record = await prisma.userSecrets.findFirst({
            where: { userId: session!.user.id, type: result.data },
            select: { id: true },
        })

        return NextResponse.json({ present: record !== null })
    } catch {
        return NextResponse.json({ error: 'Failed to check secret' }, { status: 500 })
    }
}
