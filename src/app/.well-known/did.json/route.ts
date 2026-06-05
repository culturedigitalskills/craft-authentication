import { NextResponse } from 'next/server'
import { getDIDDocument } from '@/lib/did/config'

export async function GET() {
    try {
        const doc = getDIDDocument()
        return NextResponse.json(doc, {
            headers: { 'Cache-Control': 'public, max-age=3600' },
        })
    } catch {
        return NextResponse.json({ error: 'DID document unavailable' }, { status: 503 })
    }
}
