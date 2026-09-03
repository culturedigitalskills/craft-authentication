import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { errorResponse, handleValidationError } from '@/lib/validations/types'
import {
    ANSWER_KEYS,
    CreateStoryFilmSchema,
    UpdateStoryFilmSchema,
    UploadStoryFilmSchema,
} from '@/lib/validations/craftStory'
import { deleteMediaFiles } from '@/lib/media-delete'
import { enqueueTranscription } from '@/lib/transcription'
import { mediaKind } from '@/lib/media-kind'
import { PLAYABLE_FILM_MIME_TYPES } from '@/lib/validations/media'
import { siteBaseUrl } from '@/lib/site-url'
import type { FilmInputs } from '@/lib/film/planner'
import { computeInputsHash } from '@/lib/film/hash'
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
        profileUrl: `${siteBaseUrl()}/artisans/${story.artisan.slug}`,
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
                source: true,
                isPublic: true,
                outputMediaId: true,
                durationSec: true,
                error: true,
                inputsHash: true,
                updatedAt: true,
            },
        })
        if (!film) return NextResponse.json({ film: null, stale: false })

        // Staleness compares a render against the inputs it was built from, so
        // it means nothing for a film the artisan supplied: their film does not
        // go out of date when they edit an answer, and nagging them to
        // regenerate would offer to replace it with a generated one.
        let stale = false
        if (film.status === 'READY' && film.source === 'RENDERED') {
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

// A render that claimed the row this recently is presumed alive; the same
// window film/jobs.ts uses before it reclaims an abandoned PROCESSING row.
const ACTIVE_RENDER_MS = 30 * 60 * 1000

/**
 * PUT — adopt a video the artisan already uploaded as their story film, instead
 * of assembling one from their answers. For artisans who arrive with a film
 * someone already made for them, the wizard's record-and-assemble flow is work
 * they have no reason to repeat.
 *
 * The media must already exist (uploaded through /api/media/upload, which does
 * the type and size validation) and must belong to the caller.
 */
export async function PUT(request: NextRequest) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const story = await loadStory(session!.user.id)
        if (!story) return errorResponse('No story to film', 404)

        const { mediaId, durationSec } = UploadStoryFilmSchema.parse(await request.json())

        // Ownership and kind are read from the stored row, never from the
        // client: mimeType was assigned server-side at upload.
        const media = await prisma.mediaFile.findUnique({
            where: { id: mediaId },
            select: { id: true, mimeType: true, uploaderId: true },
        })
        if (!media) return errorResponse('Media file not found', 404)
        if (media.uploaderId !== session!.user.id && session!.user.role !== 'ADMIN') {
            return errorResponse('Forbidden', 403)
        }
        // Not just any video: the file is played back as-is on the public page,
        // so a container browsers cannot decode would leave a blank player.
        if (!PLAYABLE_FILM_MIME_TYPES.includes(media.mimeType)) {
            return NextResponse.json(
                {
                    error: 'UNPLAYABLE_FORMAT',
                    message:
                        'Web browsers cannot play this kind of video, so it would show as a blank player on your public story. Convert it to MP4 and upload it again.',
                },
                { status: 400 },
            )
        }

        const existing = await prisma.storyFilm.findUnique({
            where: { storyId: story.id },
            select: { outputMediaId: true, status: true, updatedAt: true },
        })

        // Never overwrite a render that is still running: it holds this row and
        // would report READY over the uploaded film when it finished.
        const renderActive =
            existing?.status === 'PROCESSING' &&
            Date.now() - existing.updatedAt.getTime() < ACTIVE_RENDER_MS
        if (renderActive) {
            return NextResponse.json(
                {
                    error: 'RENDER_IN_PROGRESS',
                    message: 'A film is being created right now. Wait for it to finish, then upload yours.',
                },
                { status: 409 },
            )
        }

        // isPublic is deliberately left alone, so replacing the film on an
        // already published story keeps the story live.
        const film = await prisma.storyFilm.upsert({
            where: { storyId: story.id },
            create: {
                storyId: story.id,
                status: 'READY',
                source: 'UPLOADED',
                outputMediaId: mediaId,
                durationSec: durationSec ?? null,
            },
            update: {
                status: 'READY',
                source: 'UPLOADED',
                outputMediaId: mediaId,
                durationSec: durationSec ?? null,
                // An uploaded film was never planned, so there is nothing to
                // compare against and it can never be stale.
                inputsHash: null,
                error: null,
            },
        })

        // The film it replaced is now unreferenced, along with its captions.
        if (existing?.outputMediaId && existing.outputMediaId !== mediaId) {
            await deleteMediaFiles([existing.outputMediaId])
        }

        // Captions are generated the same way as for a rendered film, so
        // /api/media/[id]/subtitles serves them once Groq finishes. Non-fatal:
        // the film is already usable without them.
        try {
            await enqueueTranscription(mediaId)
        } catch (transcriptionError) {
            console.error('Caption enqueue failed for uploaded film', mediaId, transcriptionError)
        }

        // inputsHash is an internal render detail; GET strips it too.
        const { inputsHash: _inputsHash, ...filmView } = film
        return NextResponse.json({ film: filmView })
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Error saving uploaded story film:', error)
        return errorResponse('Failed to save uploaded film', 500)
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
