import { NextResponse } from 'next/server'
import { C2PAService } from '@/lib/c2pa-service'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        
        // Inspect the manifest cryptographically
        const manifestResult = await C2PAService.inspectManifest(buffer)

        return NextResponse.json({
            hasManifest: manifestResult.hasManifest,
            verified: manifestResult.authentic,
            untrusted: manifestResult.untrusted || false,
            error: manifestResult.authentic ? null : (manifestResult.validationStatus[0] || 'No C2PA manifest found or signature invalid'),
            artisanName: manifestResult.artisanName || null,
            creatorUserId: manifestResult.creatorUserId || null,
            issuer: manifestResult.issuer || null,
            validationStatus: manifestResult.validationStatus,
            manifest: manifestResult.manifest || null,
            date: manifestResult.date || null,
            assertions: manifestResult.assertions || []
        })
    } catch (error: any) {
        console.error('Error in POST /api/c2pa/verify:', error?.message ?? error)
        return NextResponse.json({ error: error?.message || String(error) || 'Verification failed' }, { status: 500 })
    }
}
