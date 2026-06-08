import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { KMS } from '@/lib/kms'
import { C2PAService } from '@/lib/c2pa-service'

export async function POST(request: Request) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const userId = session!.user.id

    try {
        let commonName: string | undefined = undefined
        try {
            const body = await request.json()
            if (body && typeof body.commonName === 'string') {
                commonName = body.commonName.trim() || undefined
            }
        } catch (e) {
            // Ignore if body is not JSON or commonName is not provided
        }

        // Retrieve the user's wrapped vault key
        const escrowRecord = await prisma.userWrappedVaultKeys.findFirst({
            where: { userId, wrapMode: 'SSE_KMS' },
        })

        if (!escrowRecord) {
            return NextResponse.json(
                { error: 'Vault is not initialized. Please set up your vault first.' },
                { status: 400 }
            )
        }

        // Unwrap the vault master key using the server KMS
        const masterKey = await KMS.unwrapMasterKey(escrowRecord.wrappedKey)

        try {
            // Generate key pair, sign cert, and store encrypted in database
            await C2PAService.generateAndStoreCredentials(userId, masterKey, commonName)
        } finally {
            // Guarantee memory cleanup
            masterKey.fill(0)
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error setting up C2PA:', error)
        return NextResponse.json({ error: error.message || 'Failed to configure C2PA' }, { status: 500 })
    }
}
