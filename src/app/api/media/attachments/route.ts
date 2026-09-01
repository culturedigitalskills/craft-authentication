import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateMediaAttachmentSchema, ReorderMediaAttachmentsSchema } from '@/lib/validations/media'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'
import { enqueueTranscription } from '@/lib/transcription'
import { deleteMediaFiles } from '@/lib/media-delete'

export async function POST(request: NextRequest) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const body = await request.json()
        const validatedData = CreateMediaAttachmentSchema.parse(body)

        // Verify the user owns the underlying MediaFile they are trying to attach
        const mediaFile = await prisma.mediaFile.findUnique({
            where: { id: validatedData.mediaId },
            select: { uploaderId: true },
        })
        if (!mediaFile) return errorResponse('Media file not found', 404)
        if (mediaFile.uploaderId && mediaFile.uploaderId !== session!.user.id && session!.user.role !== 'ADMIN') {
            return errorResponse('Forbidden', 403)
        }

        // Verify the user owns the entity they're attaching to
        if (validatedData.entityType === 'Artisan') {
            const artisan = await prisma.artisan.findUnique({
                where: { id: validatedData.entityId },
                select: { userId: true },
            })
            if (!artisan || artisan.userId !== session!.user.id) {
                return errorResponse('Forbidden', 403)
            }
        } else if (validatedData.entityType === 'Group') {
            // Site admins can attach to any group
            if (session!.user.role !== 'ADMIN') {
                // Check if user is a group admin
                const artisan = await prisma.artisan.findUnique({
                    where: { userId: session!.user.id },
                    select: { id: true },
                })
                const membership = artisan
                    ? await prisma.artisanGroupMembership.findUnique({
                          where: { artisanId_groupId: { artisanId: artisan.id, groupId: validatedData.entityId } },
                          select: { role: true },
                      })
                    : null
                if (!membership || membership.role !== 'ADMIN') {
                    return errorResponse('Forbidden', 403)
                }
            }
        } else if (validatedData.entityType === 'CraftStory') {
            const story = await prisma.craftStory.findUnique({
                where: { id: validatedData.entityId },
                select: { artisan: { select: { userId: true } } },
            })
            if (!story || story.artisan.userId !== session!.user.id) {
                return errorResponse('Forbidden', 403)
            }
        } else {
            return errorResponse('Unsupported entity type', 400)
        }

        // Remove existing primary attachment for this entity if replacing,
        // remembering the displaced media so its files can be GC'd below.
        let displacedMediaIds: string[] = []
        if (validatedData.isPrimary) {
            const displaced = await prisma.mediaAttachment.findMany({
                where: {
                    entityType: validatedData.entityType,
                    entityId: validatedData.entityId,
                    attachmentType: validatedData.attachmentType,
                    isPrimary: true,
                },
                select: { mediaId: true },
            })
            displacedMediaIds = displaced.map(a => a.mediaId)
            await prisma.mediaAttachment.deleteMany({
                where: {
                    entityType: validatedData.entityType,
                    entityId: validatedData.entityId,
                    attachmentType: validatedData.attachmentType,
                    isPrimary: true,
                },
            })
        }

        const attachment = await prisma.mediaAttachment.create({
            data: {
                mediaId: validatedData.mediaId,
                entityType: validatedData.entityType,
                entityId: validatedData.entityId,
                attachmentType: validatedData.attachmentType,
                isPrimary: validatedData.isPrimary,
                isPublic: validatedData.isPublic,
                displayOrder: validatedData.displayOrder,
            },
        })

        // GC the replaced files. deleteMediaFiles is reference-aware, so a
        // file still attached elsewhere (gallery, a craft, or re-attached by
        // this very request) is kept. Must run after the create above so a
        // re-attachment of the same media still counts as a reference.
        if (displacedMediaIds.length > 0) void deleteMediaFiles(displacedMediaIds)

        // Queue English captions for workshop videos attached to a story.
        // enqueueTranscription no-ops for non-video media. Non-fatal — the
        // attachment already exists, and a failed enqueue retries on the
        // artisan's next save.
        if (validatedData.entityType === 'CraftStory') {
            try {
                await enqueueTranscription(validatedData.mediaId)
            } catch (transcriptionError) {
                console.error('Transcription enqueue failed for media', validatedData.mediaId, transcriptionError)
            }
        }

        return NextResponse.json(attachment, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error creating media attachment:', error)
        return errorResponse('Failed to create media attachment', 500)
    }
}

/**
 * Reorder a story's workshop media. The body carries the full intended
 * sequence, which is renumbered into displayOrder in one transaction, so a
 * request either applies completely or not at all.
 *
 * Order is not cosmetic here: the public story page lists workshop media by
 * displayOrder, and the film planner deals visuals to shots in that order, so
 * this is how an artisan decides what opens their film.
 */
export async function PATCH(request: NextRequest) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const { entityId, orderedAttachmentIds } = ReorderMediaAttachmentsSchema.parse(
            await request.json(),
        )

        const story = await prisma.craftStory.findUnique({
            where: { id: entityId },
            select: { artisan: { select: { userId: true } } },
        })
        if (!story) return errorResponse('Story not found', 404)
        if (story.artisan.userId !== session!.user.id && session!.user.role !== 'ADMIN') {
            return errorResponse('Forbidden', 403)
        }

        // The request must account for every workshop attachment exactly once,
        // otherwise a stale client could silently drop items out of the order.
        const existing = await prisma.mediaAttachment.findMany({
            where: { entityType: 'CraftStory', entityId, attachmentType: 'PROCESS' },
            select: { id: true },
        })
        const existingIds = new Set(existing.map(a => a.id))
        const requestedIds = new Set(orderedAttachmentIds)
        const matches =
            requestedIds.size === orderedAttachmentIds.length &&
            existingIds.size === requestedIds.size &&
            orderedAttachmentIds.every(id => existingIds.has(id))
        if (!matches) {
            return errorResponse('Order must list every workshop attachment exactly once', 400)
        }

        await prisma.$transaction(
            orderedAttachmentIds.map((id, displayOrder) =>
                prisma.mediaAttachment.update({ where: { id }, data: { displayOrder } }),
            ),
        )

        return NextResponse.json({ orderedAttachmentIds })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error reordering media attachments:', error)
        return errorResponse('Failed to reorder media attachments', 500)
    }
}
