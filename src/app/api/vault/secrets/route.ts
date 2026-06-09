import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { StoreSecretBodySchema } from '@/lib/vault-types'

export async function POST(request: Request) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const result = StoreSecretBodySchema.safeParse(body)
    if (!result.success) {
        return NextResponse.json({ error: 'Invalid request body', details: result.error.issues }, { status: 400 })
    }

    const { type, ciphertext_data } = result.data

    try {
        const existing = await prisma.userSecrets.findFirst({
            where: { userId: session!.user.id, type },
        })

        if (existing) {
            await prisma.userSecrets.update({
                where: { id: existing.id },
                data: { ciphertextData: ciphertext_data },
            })
        } else {
            await prisma.userSecrets.create({
                data: {
                    userId: session!.user.id,
                    type,
                    ciphertextData: ciphertext_data,
                },
            })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to save secret' }, { status: 500 })
    }
}
