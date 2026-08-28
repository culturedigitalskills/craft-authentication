import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { errorResponse } from '@/lib/validations/types'
import { ANSWER_MEDIA_FIELDS } from '@/lib/validations/craftStory'
import { enqueueTranscription } from '@/lib/transcription'
import type { TranscriptSegment } from '@/lib/vtt'

// All media ids on the current user's story that can carry captions (answer
// recordings + workshop media), or null when there's no artisan/story.
async function storyMediaIds(userId: string): Promise<string[] | null> {
    const artisan = await prisma.artisan.findUnique({
        where: { userId },
        select: { id: true },
    })
    if (!artisan) return null

    const story = await prisma.craftStory.findUnique({ where: { artisanId: artisan.id } })
    if (!story) return null

    const answerMediaIds = ANSWER_MEDIA_FIELDS.map(k => story[k]).filter(
        (v): v is string => typeof v === 'string',
    )
    const workshopAttachments = await prisma.mediaAttachment.findMany({
        where: { entityType: 'CraftStory', entityId: story.id },
        select: { mediaId: true },
    })
    return [...new Set([...answerMediaIds, ...workshopAttachments.map(a => a.mediaId)])]
}

/**
 * Caption status per media id, plus the timed segments of the ready ones. The
 * segments let the wizard's film storyboard snap its cuts to the same speech
 * beats the renderer will use, so the preview matches the eventual film.
 */
async function transcriptsFor(mediaIds: string[]): Promise<{
    statuses: Record<string, string>
    segments: Record<string, TranscriptSegment[]>
}> {
    if (mediaIds.length === 0) return { statuses: {}, segments: {} }
    const transcripts = await prisma.mediaTranscript.findMany({
        where: { mediaId: { in: mediaIds } },
        select: { mediaId: true, status: true, segments: true },
    })

    const statuses: Record<string, string> = {}
    const segments: Record<string, TranscriptSegment[]> = {}
    for (const t of transcripts) {
        statuses[t.mediaId] = t.status
        if (t.status === 'READY' && t.segments) {
            segments[t.mediaId] = t.segments as unknown as TranscriptSegment[]
        }
    }
    return { statuses, segments }
}

/**
 * Caption-generation status for the current user's story recordings, keyed by
 * mediaId. Both video and audio answers (and workshop videos) get transcript
 * rows; media with none simply doesn't appear. Powers the wizard status chips.
 */
export async function GET() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const mediaIds = await storyMediaIds(session!.user.id)
        if (!mediaIds) return NextResponse.json({ statuses: {}, segments: {} })
        return NextResponse.json(await transcriptsFor(mediaIds))
    } catch (error) {
        console.error('Error fetching caption statuses:', error)
        return errorResponse('Failed to fetch caption statuses', 500)
    }
}

/**
 * Retry captions that failed (e.g. a transient upstream error). Re-enqueues only
 * the FAILED transcripts for this story's media; enqueueTranscription re-claims
 * FAILED rows and no-ops for anything already done or in flight. Returns the
 * refreshed statuses.
 */
export async function POST() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const mediaIds = await storyMediaIds(session!.user.id)
        if (!mediaIds) return NextResponse.json({ statuses: {}, segments: {} })

        const failed = await prisma.mediaTranscript.findMany({
            where: { mediaId: { in: mediaIds }, status: 'FAILED' },
            select: { mediaId: true },
        })
        await Promise.all(failed.map(f => enqueueTranscription(f.mediaId)))

        return NextResponse.json(await transcriptsFor(mediaIds))
    } catch (error) {
        console.error('Error retrying captions:', error)
        return errorResponse('Failed to retry captions', 500)
    }
}
