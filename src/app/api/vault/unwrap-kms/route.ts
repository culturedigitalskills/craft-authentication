import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { KMS } from '@/lib/kms'
import { bytesToBase64 } from '@/lib/crypto-vault'

export async function POST() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const userId = session!.user.id

        // Retrieve the SSE_KMS wrapped vault key for the user
        const kmsRecord = await prisma.userWrappedVaultKeys.findFirst({
            where: {
                userId: userId,
                wrapMode: 'SSE_KMS',
            },
        })

        if (!kmsRecord) {
            return NextResponse.json(
                { error: 'Server KMS escrow not enabled or found for this user' },
                { status: 404 }
            )
        }

        // Unwrap the vault key using KMS
        const rawMasterKey = await KMS.unwrapMasterKey(kmsRecord.wrappedKey)

        // Convert raw key to base64 for transmission over TLS
        const masterKeyBase64 = bytesToBase64(rawMasterKey)

        // Wipe the raw key from memory variables
        rawMasterKey.fill(0)

        return NextResponse.json({ masterKey: masterKeyBase64 })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Failed to unwrap KMS escrow' },
            { status: 500 }
        )
    }
}
