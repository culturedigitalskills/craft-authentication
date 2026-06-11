import { NextRequest, NextResponse } from 'next/server'
import { testVcSigning } from '@/lib/did/vc'
import { errorResponse } from '@/lib/validations/types'

function isAuthorized(request: NextRequest): boolean {
    if (process.env.NODE_ENV !== 'production') return true

    const expectedToken = process.env.VC_TEST_TOKEN
    if (!expectedToken) return false

    const providedToken = request.headers.get('x-vc-test-token')
    return providedToken === expectedToken
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return errorResponse('Signing test endpoint is disabled or unauthorized', 403)
    }

    const result = await testVcSigning()
    const status = result.signed && result.verified ? 200 : 500

    return NextResponse.json(
        {
            ok: result.signed && result.verified,
            ...result,
        },
        { status },
    )
}
