import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/validations/types'
import { segmentsToVtt, type TranscriptSegment } from '@/lib/vtt'

/**
 * Serve the English captions for a video as WebVTT, for the player's <track>.
 * Public, matching the public media GET — captions are derived from already
 * public media. Returns 404 until a READY transcript exists.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params

        const transcript = await prisma.mediaTranscript.findUnique({
            where: { mediaId: id },
            select: { status: true, segments: true },
        })

        if (!transcript || transcript.status !== 'READY' || !transcript.segments) {
            return errorResponse('Captions not available', 404)
        }

        const segments = transcript.segments as unknown as TranscriptSegment[]
        const vtt = segmentsToVtt(segments)

        return new NextResponse(vtt, {
            headers: {
                'Content-Type': 'text/vtt; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
            },
        })
    } catch (error) {
        console.error('Error building captions:', error)
        return errorResponse('Failed to build captions', 500)
    }
}
