import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/validations/types'
import { segmentsToVtt, type TranscriptSegment } from '@/lib/vtt'
import { resolveMediaAccess } from '@/lib/media-visibility'
import { auth } from '@/lib/auth'

/**
 * Serve the English captions for a video as WebVTT, for the player's <track>.
 * Gated exactly like the video itself: captions are a transcript of it, so
 * serving them to someone who may not watch it would hand over the words of a
 * story that is still unpublished, or one whose artisan has been removed.
 * Returns 404 until a READY transcript exists.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params

        const media = await prisma.mediaFile.findUnique({
            where: { id },
            select: { uploaderId: true },
        })
        if (!media) return errorResponse('Captions not available', 404)

        const access = await resolveMediaAccess(id, media.uploaderId)
        if (!access.isPublic) {
            const session = await auth()
            const isOwner =
                Boolean(session?.user?.id) &&
                (session!.user.id === media.uploaderId ||
                    session!.user.id === access.ownerUserId)
            if (!isOwner && session?.user?.role !== 'ADMIN') {
                return errorResponse('Captions not available', 404)
            }
        }

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
                'Cache-Control': access.isPublic ? 'public, max-age=3600' : 'private, no-store',
            },
        })
    } catch (error) {
        console.error('Error building captions:', error)
        return errorResponse('Failed to build captions', 500)
    }
}
