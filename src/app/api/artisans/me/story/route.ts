import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { errorResponse, handleValidationError } from '@/lib/validations/types'
import {
    ANSWER_MEDIA_FIELDS,
    UpdateCraftStorySchema,
} from '@/lib/validations/craftStory'
import { deleteMediaFiles } from '@/lib/media-delete'
import { collectTranscriptAudioIds, enqueueTranscription } from '@/lib/transcription'

export async function GET() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const artisan = await prisma.artisan.findUnique({
            where: { userId: session!.user.id },
            select: { id: true },
        })
        if (!artisan) return NextResponse.json({ story: null, artisanId: null })

        const story = await prisma.craftStory.findUnique({
            where: { artisanId: artisan.id },
        })

        return NextResponse.json({ story: story ?? null, artisanId: artisan.id })
    } catch (error) {
        console.error('Error fetching craft story:', error)
        return errorResponse('Failed to fetch craft story', 500)
    }
}

export async function PUT(request: NextRequest) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const artisan = await prisma.artisan.findUnique({
            where: { userId: session!.user.id },
            select: { id: true },
        })
        if (!artisan) return errorResponse('Artisan profile required', 409)

        const body = await request.json()
        const { expectedUpdatedAt, ...patch } = UpdateCraftStorySchema.parse(body)

        // Validate that every answer*MediaId being saved was uploaded by this user.
        const submittedMediaIds = ANSWER_MEDIA_FIELDS
            .map(k => patch[k])
            .filter((v): v is string => typeof v === 'string' && v.length > 0)
        if (submittedMediaIds.length > 0) {
            const files = await prisma.mediaFile.findMany({
                where: { id: { in: submittedMediaIds } },
                select: { id: true, uploaderId: true },
            })
            const ownedIds = new Set(
                files
                    .filter(f => f.uploaderId === session!.user.id)
                    .map(f => f.id)
            )
            const unauthorizedIds = submittedMediaIds.filter(id => !ownedIds.has(id))
            if (unauthorizedIds.length > 0) {
                return errorResponse('You do not own one or more of the referenced media files', 403)
            }
        }

        const existing = await prisma.craftStory.findUnique({
            where: { artisanId: artisan.id },
        })

        // Two-tab overwrite guard: if the client tells us when it last loaded the story,
        // refuse the write when the server-side updatedAt has moved past that point.
        if (existing && expectedUpdatedAt) {
            const expected = new Date(expectedUpdatedAt).getTime()
            const actual = new Date(existing.updatedAt).getTime()
            if (Number.isFinite(expected) && actual > expected) {
                return NextResponse.json(
                    { error: 'Story was updated elsewhere. Reload to see the latest version.', current: existing },
                    { status: 409 }
                )
            }
        }

        // If the artisan is replacing the per-question media on a field that already has one,
        // hard-delete the prior MediaFile so we don't leak Garage objects.
        const replacedMediaIds: string[] = []
        if (existing) {
            for (const field of ANSWER_MEDIA_FIELDS) {
                if (Object.prototype.hasOwnProperty.call(patch, field)) {
                    const prior = existing[field]
                    const next = patch[field] ?? null
                    if (prior && prior !== next) replacedMediaIds.push(prior)
                }
            }
        }

        const story = await prisma.craftStory.upsert({
            where: { artisanId: artisan.id },
            create: { artisanId: artisan.id, ...patch },
            update: patch,
        })

        if (replacedMediaIds.length > 0) {
            // Collect the extracted-audio assets before the source videos are
            // GC'd (transcript rows cascade with the source; audio does not),
            // then remove the source media and their audio together.
            const audioIds = await collectTranscriptAudioIds(replacedMediaIds)
            // Fire-and-forget; failure here shouldn't fail the save.
            void deleteMediaFiles([...replacedMediaIds, ...audioIds])
        }

        // Queue English captions for any answer videos referenced in this save.
        // enqueueTranscription no-ops for non-video media and work already done.
        if (submittedMediaIds.length > 0) {
            await Promise.all(submittedMediaIds.map(enqueueTranscription))
        }

        return NextResponse.json({ story })
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Error saving craft story:', error)
        return errorResponse('Failed to save craft story', 500)
    }
}

export async function DELETE() {
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
        if (!story) return NextResponse.json({ ok: true })

        // Collect everything we need to garbage-collect after the row is gone.
        const answerMediaIds = ANSWER_MEDIA_FIELDS
            .map(k => story[k])
            .filter((v): v is string => typeof v === 'string')

        const workshopAttachments = await prisma.mediaAttachment.findMany({
            where: { entityType: 'CraftStory', entityId: story.id },
            select: { mediaId: true },
        })
        const workshopMediaIds = workshopAttachments.map(a => a.mediaId)

        await prisma.mediaAttachment.deleteMany({
            where: { entityType: 'CraftStory', entityId: story.id },
        })
        await prisma.craftStory.delete({ where: { artisanId: artisan.id } })

        // Extracted-audio assets are keyed off the source videos and have no
        // attachment, so gather them before the source media (and their
        // cascading transcripts) are removed.
        const sourceMediaIds = [...answerMediaIds, ...workshopMediaIds]
        const transcriptAudioIds = await collectTranscriptAudioIds(sourceMediaIds)

        // Best-effort cleanup of underlying MediaFile rows + Garage objects.
        await deleteMediaFiles([...sourceMediaIds, ...transcriptAudioIds])

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Error deleting craft story:', error)
        return errorResponse('Failed to delete craft story', 500)
    }
}
