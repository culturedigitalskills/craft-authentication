import { NextRequest, NextResponse } from 'next/server'
import { verifyCraftVC } from '@/lib/did/vc'
import type { CraftCredential } from '@/lib/did/vc'
import { errorResponse } from '@/lib/validations/types'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        if (!body || typeof body !== 'object') {
            return errorResponse('Invalid credential JSON', 400)
        }

        const credential = body as Partial<CraftCredential>

        if (!credential.credentialSubject || !credential.proof || !credential.issuer?.id || !credential.validFrom) {
            return errorResponse('Missing required credential fields: credentialSubject, proof, issuer.id, validFrom', 400)
        }

        const result = await verifyCraftVC(
            credential.credentialSubject as object,
            credential.proof,
            credential.issuer.id,
            credential.validFrom,
        )

        return NextResponse.json({
            verified: result.verified,
            error: result.error ?? null,
            credential: {
                id: credential.id ?? null,
                issuer: credential.issuer,
                validFrom: credential.validFrom,
                credentialSubject: credential.credentialSubject,
            },
        })
    } catch (error) {
        console.error('VC verify error:', error)
        return errorResponse('Failed to parse or verify credential', 400)
    }
}
