import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { errorResponse } from '@/lib/validations/types'
import { ANSWER_MEDIA_FIELDS } from '@/lib/validations/craftStory'
import { enqueueTranscription } from '@/lib/transcription'

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

async function statusesFor(mediaIds: string[]): Promise<Record<string, string>> {
    if (mediaIds.length === 0) return {}
    const transcripts = await prisma.mediaTranscript.findMany({
        where: { mediaId: { in: mediaIds } },
        select: { mediaId: true, status: true },
    })
    return Object.fromEntries(transcripts.map(t => [t.mediaId, t.status]))
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
        if (!mediaIds) return NextResponse.json({ statuses: {} })
        return NextResponse.json({ statuses: await statusesFor(mediaIds) })
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
        if (!mediaIds) return NextResponse.json({ statuses: {} })

        const failed = await prisma.mediaTranscript.findMany({
            where: { mediaId: { in: mediaIds }, status: 'FAILED' },
            select: { mediaId: true },
        })
        await Promise.all(failed.map(f => enqueueTranscription(f.mediaId)))

        return NextResponse.json({ statuses: await statusesFor(mediaIds) })
    } catch (error) {
        console.error('Error retrying captions:', error)
        return errorResponse('Failed to retry captions', 500)
    }
}
