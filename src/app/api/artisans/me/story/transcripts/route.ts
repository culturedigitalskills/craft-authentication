import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { errorResponse } from '@/lib/validations/types'
import { ANSWER_MEDIA_FIELDS } from '@/lib/validations/craftStory'

/**
 * Caption-generation status for the current user's story recordings, keyed by
 * mediaId. Both video and audio answers (and workshop videos) get transcript
 * rows; media with none simply doesn't appear. Powers the wizard status chips.
 */
export async function GET() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const artisan = await prisma.artisan.findUnique({
            where: { userId: session!.user.id },
            select: { id: true },
        })
        if (!artisan) return NextResponse.json({ statuses: {} })

        const story = await prisma.craftStory.findUnique({
            where: { artisanId: artisan.id },
        })
        if (!story) return NextResponse.json({ statuses: {} })

        const answerMediaIds = ANSWER_MEDIA_FIELDS
            .map(k => story[k])
            .filter((v): v is string => typeof v === 'string')
        const workshopAttachments = await prisma.mediaAttachment.findMany({
            where: { entityType: 'CraftStory', entityId: story.id },
            select: { mediaId: true },
        })
        const mediaIds = [...new Set([...answerMediaIds, ...workshopAttachments.map(a => a.mediaId)])]
        if (mediaIds.length === 0) return NextResponse.json({ statuses: {} })

        const transcripts = await prisma.mediaTranscript.findMany({
            where: { mediaId: { in: mediaIds } },
            select: { mediaId: true, status: true },
        })

        return NextResponse.json({
            statuses: Object.fromEntries(transcripts.map(t => [t.mediaId, t.status])),
        })
    } catch (error) {
        console.error('Error fetching caption statuses:', error)
        return errorResponse('Failed to fetch caption statuses', 500)
    }
}
