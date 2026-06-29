import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { KMS } from '@/lib/kms'

export async function GET() {
    const { unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const publicKey = KMS.getPublicWrappingKey()
        return NextResponse.json({ publicKey })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Failed to retrieve KMS public key' },
            { status: 500 }
        )
    }
}
