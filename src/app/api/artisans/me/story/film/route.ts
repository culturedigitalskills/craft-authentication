import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { errorResponse, handleValidationError } from '@/lib/validations/types'
import {
    ANSWER_KEYS,
    CreateStoryFilmSchema,
    UpdateStoryFilmSchema,
} from '@/lib/validations/craftStory'
import { mediaKind } from '@/lib/media-kind'
import { computeInputsHash, type FilmInputs } from '@/lib/film/planner'
import { canMakeFilm } from '@/lib/film/eligibility'
import { enqueueFilm } from '@/lib/film/jobs'

const FILM_TEMPLATE_VERSION = 1

type StoryWithArtisan = {
    id: string
    artisan: { firstName: string; lastName: string; slug: string }
} & Record<string, unknown>

async function loadStory(userId: string): Promise<StoryWithArtisan | null> {
    const artisan = await prisma.artisan.findUnique({
        where: { userId },
        select: { id: true, firstName: true, lastName: true, slug: true },
    })
    if (!artisan) return null
    const story = await prisma.craftStory.findUnique({ where: { artisanId: artisan.id } })
    if (!story) return null
    return { ...story, artisan }
}

function serverBaseUrl(): string {
    return (
        process.env.NEXT_PUBLIC_SERVER_URL ||
        process.env.AUTH_URL ||
        'https://www.sustainablecrafting.org'
    )
}

/**
 * Ingredient counts + the hash-relevant FilmInputs, from DB metadata only (no
 * media download or duration probing — durations don't affect the hash). Shared
 * by the POST minimum-ingredients check and the GET staleness check.
 */
async function collectMeta(story: StoryWithArtisan) {
    const answerMediaIds = ANSWER_KEYS.map(k => story[`answer${k}MediaId`] as string | null).filter(
        (v): v is string => typeof v === 'string',
    )
    const mediaRows = await prisma.mediaFile.findMany({
        where: { id: { in: answerMediaIds } },
        select: { id: true, mimeType: true },
    })
    const kindById = new Map(mediaRows.map(m => [m.id, mediaKind(m.mimeType)]))

    const workshop = await prisma.mediaAttachment.findMany({
        where: { entityType: 'CraftStory', entityId: story.id, attachmentType: 'PROCESS' },
        include: { media: { select: { id: true, mimeType: true } } },
        orderBy: { displayOrder: 'asc' },
    })

    let spokenCount = 0
    let videoAnswerCount = 0
    const chapters = ANSWER_KEYS.map(key => {
        const mediaId = story[`answer${key}MediaId`] as string | null
        const kind = mediaId ? kindById.get(mediaId) : undefined
        const isSpoken = kind === 'audio' || kind === 'video'
        if (isSpoken) spokenCount++
        if (kind === 'video') videoAnswerCount++
        return {
            key,
            titleCardText: '',
            voiceMediaId: isSpoken ? (mediaId as string) : null,
            voiceKind: (isSpoken ? kind : null) as 'audio' | 'video' | null,
            voiceDurationSec: 0,
            segments: null,
        }
    })

    const visuals = workshop
        .filter(a => a.media && mediaKind(a.media.mimeType) !== 'audio')
        .map(a => ({
            mediaId: a.media!.id,
            kind: mediaKind(a.media!.mimeType) === 'video' ? ('video' as const) : ('image' as const),
        }))

    const hashInputs: FilmInputs = {
        artisanName: `${story.artisan.firstName} ${story.artisan.lastName}`.trim(),
        profileUrl: `${serverBaseUrl()}/artisans/${story.artisan.slug}`,
        chapters,
        visuals,
        templateVersion: FILM_TEMPLATE_VERSION,
    }

    return { spokenCount, videoAnswerCount, workshopCount: visuals.length, hashInputs }
}

// POST — enqueue a render (force=true regenerates a READY film).
export async function POST(request: NextRequest) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const story = await loadStory(session!.user.id)
        if (!story) return errorResponse('No story to film', 404)

        const body = await request.json().catch(() => ({}))
        const { force } = CreateStoryFilmSchema.parse(body)

        if (!canMakeFilm(await collectMeta(story))) {
            return NextResponse.json(
                {
                    error: 'INSUFFICIENT_INPUTS',
                    message: 'A film needs at least one spoken answer and at least one photo or video.',
                },
                { status: 400 },
            )
        }

        await enqueueFilm(story.id, { force })
        const film = await prisma.storyFilm.findUnique({ where: { storyId: story.id } })
        return NextResponse.json({ film }, { status: 202 })
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Error enqueuing story film:', error)
        return errorResponse('Failed to start film', 500)
    }
}

// GET — current film status plus whether the story changed since it rendered.
export async function GET() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const story = await loadStory(session!.user.id)
        if (!story) return NextResponse.json({ film: null, stale: false })

        const film = await prisma.storyFilm.findUnique({
            where: { storyId: story.id },
            select: {
                status: true,
                isPublic: true,
                outputMediaId: true,
                durationSec: true,
                error: true,
                inputsHash: true,
                updatedAt: true,
            },
        })
        if (!film) return NextResponse.json({ film: null, stale: false })

        let stale = false
        if (film.status === 'READY') {
            const { hashInputs } = await collectMeta(story)
            stale = film.inputsHash !== computeInputsHash(hashInputs)
        }

        const { inputsHash: _inputsHash, ...filmView } = film
        return NextResponse.json({ film: filmView, stale })
    } catch (error) {
        console.error('Error fetching story film:', error)
        return errorResponse('Failed to fetch film', 500)
    }
}

// PATCH — publish/unpublish the rendered film.
export async function PATCH(request: NextRequest) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const story = await loadStory(session!.user.id)
        if (!story) return errorResponse('No story to film', 404)

        const body = await request.json()
        const { isPublic } = UpdateStoryFilmSchema.parse(body)

        const film = await prisma.storyFilm.findUnique({ where: { storyId: story.id } })
        if (!film || film.status !== 'READY') {
            return errorResponse('Film is not ready to publish', 409)
        }

        const updated = await prisma.storyFilm.update({
            where: { storyId: story.id },
            data: { isPublic },
        })
        return NextResponse.json({ film: updated })
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Error updating story film:', error)
        return errorResponse('Failed to update film', 500)
    }
}
