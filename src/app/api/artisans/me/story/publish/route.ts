import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireActiveArtisan } from '@/lib/auth-guard'
import { errorResponse, handleValidationError } from '@/lib/validations/types'
import { ANSWER_TEXT_FIELDS, PublishStorySchema } from '@/lib/validations/craftStory'
import { editionAnswers, editionMediaIds } from '@/lib/story-publication'
import { canMakeFilm, getFilmIngredients } from '@/lib/film/eligibility'
import { enqueueFilm } from '@/lib/film/jobs'
import { deleteMediaFiles } from '@/lib/media-delete'

export async function POST(request: Request) {
    const { session, unauthorized } = await requireActiveArtisan()
    if (unauthorized) return unauthorized
    try {
        const { consent, expectedUpdatedAt, featureFilmId } = PublishStorySchema.parse(
            await request.json().catch(() => ({})),
        )
        const result = await prisma.$transaction(async (tx) => {
            const story = await tx.craftStory.findFirst({
                where: { artisan: { userId: session!.user.id } },
                include: { publication: true, film: true },
            })
            if (!story) return { response: errorResponse('No story to publish', 404) }
            if (!story.consentedAt && !consent) {
                return {
                    response: NextResponse.json({ error: 'CONSENT_REQUIRED' }, { status: 400 }),
                }
            }
            const workshop = await tx.mediaAttachment.findMany({
                where: { entityType: 'CraftStory', entityId: story.id, attachmentType: 'PROCESS' },
                orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
                select: { mediaId: true },
            })
            const answers = editionAnswers(story)
            const workshopIds = workshop.map((a) => a.mediaId)
            const mediaIds = editionMediaIds(answers, workshopIds)
            if (
                featureFilmId &&
                (story.film?.status !== 'READY' || story.film.outputMediaId !== featureFilmId)
            )
                return {
                    response: errorResponse('Review the current film before featuring it', 409),
                }
            if (
                !mediaIds.length &&
                !ANSWER_TEXT_FIELDS.some((k) => answers[k]?.trim()) &&
                !featureFilmId &&
                !story.publication?.filmMediaId
            ) {
                if (story.film?.status === 'READY')
                    return {
                        response: NextResponse.json({ error: 'SELECT_FILM' }, { status: 400 }),
                    }
                return { response: NextResponse.json({ error: 'EMPTY_STORY' }, { status: 400 }) }
            }
            const data = {
                answers,
                workshopIds,
                mediaIds,
                summaryText: story.summaryText,
                ...(featureFilmId
                    ? {
                          filmMediaId: featureFilmId,
                          filmChapters: story.film?.chapters ?? Prisma.DbNull,
                      }
                    : {}),
            }
            const now = new Date()
            const saved = await tx.craftStory.updateMany({
                where: {
                    id: story.id,
                    updatedAt: expectedUpdatedAt ? new Date(expectedUpdatedAt) : story.updatedAt,
                },
                data: {
                    status: 'PUBLISHED',
                    publishedAt: now,
                    consentedAt: story.consentedAt ?? now,
                },
            })
            if (!saved.count)
                return { response: errorResponse('Story changed. Reload before publishing.', 409) }
            // Featuring a specific reviewed film is a separate, explicit action.
            await tx.storyPublication.upsert({
                where: { storyId: story.id },
                create: { storyId: story.id, ...data },
                update: data,
            })
            if (featureFilmId)
                await tx.storyFilm.update({
                    where: { storyId: story.id, outputMediaId: featureFilmId, status: 'READY' },
                    data: { isPublic: true },
                })
            const updated = await tx.craftStory.findUniqueOrThrow({ where: { id: story.id } })
            return {
                story: updated,
                initialFilm: !story.film,
                retired: (story.publication?.mediaIds ?? []).filter((id) => !mediaIds.includes(id)),
            }
        })
        if (result.response) return result.response
        // The page is already published. A worker or caption failure cannot undo it.
        if (result.initialFilm) {
            try {
                if (canMakeFilm(await getFilmIngredients(result.story)))
                    await enqueueFilm(result.story.id)
            } catch (err) {
                console.error('Could not queue optional story film:', err)
            }
        }
        if (result.retired.length) await deleteMediaFiles(result.retired)
        return NextResponse.json({ story: result.story })
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Error publishing craft story:', error)
        return errorResponse('Failed to publish craft story', 500)
    }
}
