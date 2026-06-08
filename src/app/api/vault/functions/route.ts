import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { VAULT_FUNCTIONS } from '@/lib/vault-functions'

export async function GET() {
    const { unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const functions = Object.values(VAULT_FUNCTIONS).map((fn) => ({
        name: fn.name,
        description: fn.description,
        requiredSecretType: fn.requiredSecretType,
    }))

    return NextResponse.json({ functions })
}
