import { z } from 'zod'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireActiveArtisan } from '@/lib/auth-guard'
import { errorResponse } from '@/lib/validations/types'
import { ANSWER_MEDIA_FIELDS } from '@/lib/validations/craftStory'
import { enqueueTranscription } from '@/lib/transcription'
import { validCues, type TranscriptSegment } from '@/lib/vtt'

// All media ids on the current user's story that can carry captions (answer
// recordings + workshop media), or null when there's no artisan/story.
async function storyMediaIds(userId: string): Promise<string[] | null> {
    const artisan = await prisma.artisan.findUnique({
        where: { userId },
        select: { id: true },
    })
    if (!artisan) return null

    const story = await prisma.craftStory.findUnique({
        where: { artisanId: artisan.id },
        include: { film: { select: { outputMediaId: true, source: true } } },
    })
    if (!story) return null

    const answerMediaIds = ANSWER_MEDIA_FIELDS.map(k => story[k]).filter(
        (v): v is string => typeof v === 'string',
    )
    const workshopAttachments = await prisma.mediaAttachment.findMany({
        where: { entityType: 'CraftStory', entityId: story.id },
        select: { mediaId: true },
    })
    const ids = [...answerMediaIds, ...workshopAttachments.map(a => a.mediaId)]
    if (story.film?.source === 'UPLOADED' && story.film.outputMediaId) ids.push(story.film.outputMediaId)
    const recordings = await prisma.mediaFile.findMany({
        where: {
            id: { in: ids },
            uploaderId: userId,
            OR: [{ mimeType: { startsWith: 'audio/' } }, { mimeType: { startsWith: 'video/' } }],
        },
        select: { id: true },
    })
    return recordings.map(recording => recording.id)
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
        select: { mediaId: true, status: true, segments: true, requestedAt: true },
    })

    const statuses: Record<string, string> = Object.fromEntries(mediaIds.map(id => [id, 'AVAILABLE']))
    const segments: Record<string, TranscriptSegment[]> = {}
    for (const t of transcripts) {
        statuses[t.mediaId] = t.requestedAt || t.status === 'READY' ? t.status : 'AVAILABLE'
        if (t.status === 'READY') {
            const cues = validCues(t.segments)
            if (cues.length) segments[t.mediaId] = cues
            else delete statuses[t.mediaId]
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

const captionRequest = z.object({
    sendAudioToGroq: z.literal(true),
    mediaIds: z.array(z.uuid()).min(1),
})

export async function POST(request: Request) {
    const { session, unauthorized } = await requireActiveArtisan()
    if (unauthorized) return unauthorized

    try {
        const input = captionRequest.safeParse(await request.json().catch(() => null))
        if (!input.success) return errorResponse('Choose recordings for external captions', 400)
        const mediaIds = await storyMediaIds(session!.user.id)
        if (!mediaIds) return errorResponse('Recording no longer available', 409)
        const allowed = new Set(mediaIds)
        const selected = [...new Set(input.data.mediaIds)]
        if (selected.some(id => !allowed.has(id))) {
            return errorResponse('Recording no longer available', 409)
        }
        await Promise.all(selected.map(id => enqueueTranscription(id)))

        return NextResponse.json(await transcriptsFor(mediaIds))
    } catch (error) {
        console.error('Error requesting captions:', error)
        return errorResponse('Failed to request captions', 500)
    }
}
