import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const secrets = await prisma.userSecrets.findMany({
            where: { userId: session!.user.id },
            select: {
                id: true,
                type: true,
                ciphertextData: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        return NextResponse.json({ secrets })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Failed to retrieve secrets' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const body = await request.json()
        const { type, ciphertext_data } = body

        if (!type || !ciphertext_data) {
            return NextResponse.json(
                { error: 'Missing type or ciphertext_data' },
                { status: 400 }
            )
        }

        // Upsert by checking if this user already has a secret of this type
        const existing = await prisma.userSecrets.findFirst({
            where: {
                userId: session!.user.id,
                type: type,
            },
        })

        let secret
        if (existing) {
            secret = await prisma.userSecrets.update({
                where: { id: existing.id },
                data: { ciphertextData: ciphertext_data },
            })
        } else {
            secret = await prisma.userSecrets.create({
                data: {
                    userId: session!.user.id,
                    type: type,
                    ciphertextData: ciphertext_data,
                },
            })
        }

        return NextResponse.json({ success: true, secret })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Failed to save secret' },
            { status: 500 }
        )
    }
}
