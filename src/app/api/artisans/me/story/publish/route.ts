import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { errorResponse } from '@/lib/validations/types'
import { ANSWER_MEDIA_FIELDS, ANSWER_TEXT_FIELDS } from '@/lib/validations/craftStory'
import { canMakeFilm, getFilmIngredients } from '@/lib/film/eligibility'

export async function POST(request: Request) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        // The wizard sends { consent: true } from its consent checkbox. Older
        // clients send no body at all, which parses to an empty object.
        const body = await request.json().catch(() => ({}))
        const consentGiven = (body as { consent?: unknown }).consent === true

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

        // Publishing puts the artisan's face, voice and chosen location in
        // public, so it needs their explicit consent. Stories consented to
        // earlier keep that consent and are not asked again.
        if (!story.consentedAt && !consentGiven) {
            return NextResponse.json(
                {
                    error: 'CONSENT_REQUIRED',
                    message: 'Confirm the publication consent before publishing your story.',
                },
                { status: 400 }
            )
        }

        // If this story has the raw material for a film, require a finished one
        // before publishing (the film is the story's headline). A story that
        // can't make a film publishes as the written page, and a FAILED render
        // is allowed through so a broken render never traps the artisan.
        if (canMakeFilm(await getFilmIngredients(story))) {
            const film = await prisma.storyFilm.findUnique({
                where: { storyId: story.id },
                select: { status: true },
            })
            if (!film || film.status === 'PENDING' || film.status === 'PROCESSING') {
                return NextResponse.json(
                    {
                        error: 'FILM_REQUIRED',
                        message: 'Create your film before publishing your story.',
                    },
                    { status: 400 }
                )
            }
        }

        const updated = await prisma.craftStory.update({
            where: { artisanId: artisan.id },
            data: {
                status: 'PUBLISHED',
                publishedAt: new Date(),
                ...(story.consentedAt ? {} : { consentedAt: new Date() }),
            },
        })

        // A rendered, READY film becomes the story's public hero. The artisan has
        // already previewed it in the wizard, so publishing the story approves it.
        await prisma.storyFilm.updateMany({
            where: { storyId: story.id, status: 'READY' },
            data: { isPublic: true },
        })

        return NextResponse.json({ story: updated })
    } catch (error) {
        console.error('Error publishing craft story:', error)
        return errorResponse('Failed to publish craft story', 500)
    }
}
