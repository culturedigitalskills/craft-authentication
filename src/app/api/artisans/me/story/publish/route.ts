import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { errorResponse } from '@/lib/validations/types'
import { ANSWER_MEDIA_FIELDS, ANSWER_TEXT_FIELDS } from '@/lib/validations/craftStory'

export async function POST() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const artisan = await prisma.artisan.findUnique({
            where: { userId: session!.user.id },
            select: { id: true },
        })
        if (!artisan) return errorResponse('Artisan profile required', 409)

        const story = await prisma.craftStory.findUnique({
            where: { artisanId: artisan.id },
        })
        if (!story) return errorResponse('No story to publish', 404)

        const hasTextAnswer = ANSWER_TEXT_FIELDS.some(
            k => (story[k] ?? '').toString().trim().length > 0
        )
        const hasAnswerMedia = ANSWER_MEDIA_FIELDS.some(k => Boolean(story[k]))
        const workshopCount = await prisma.mediaAttachment.count({
            where: { entityType: 'CraftStory', entityId: story.id },
        })
        const hasContent = hasTextAnswer || hasAnswerMedia || workshopCount > 0

        if (!hasContent) {
            return NextResponse.json(
                {
                    error: 'EMPTY_STORY',
                    message: 'Add at least one written answer, recording, or workshop photo before publishing.',
                },
                { status: 400 }
            )
        }

        const updated = await prisma.craftStory.update({
            where: { artisanId: artisan.id },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
        })

        return NextResponse.json({ story: updated })
    } catch (error) {
        console.error('Error publishing craft story:', error)
        return errorResponse('Failed to publish craft story', 500)
    }
}
