import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/validations/types'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'
import { ZodError } from 'zod'
import { handleValidationError } from '@/lib/validations/types'
import { resolveEntityOwner } from '@/lib/media-ownership'
import { deleteMediaFiles } from '@/lib/media-delete'

const UpdateAttachmentSchema = z.object({
    isPublic: z.boolean(),
})

/**
 * Toggle an attachment's public/private visibility (gallery media).
 * Only the owner of the underlying Artisan (or a site admin) may change it.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const { id } = await params
        const { isPublic } = UpdateAttachmentSchema.parse(await request.json())

        const attachment = await prisma.mediaAttachment.findUnique({
            where: { id },
            select: { id: true, entityType: true, entityId: true },
        })
        if (!attachment) return errorResponse('Attachment not found', 404)

        // Verify ownership via attachment → Artisan → user (or site admin)
        if (session!.user.role !== 'ADMIN') {
            if (attachment.entityType !== 'Artisan') return errorResponse('Forbidden', 403)
            const artisan = await prisma.artisan.findUnique({
                where: { id: attachment.entityId },
                select: { userId: true },
            })
            if (!artisan || artisan.userId !== session!.user.id) {
                return errorResponse('Forbidden', 403)
            }
        }

        const updated = await prisma.mediaAttachment.update({
            where: { id },
            data: { isPublic },
            select: { id: true, isPublic: true },
        })

        return NextResponse.json(updated)
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Error updating media attachment:', error)
        return errorResponse('Failed to update media attachment', 500)
    }
}

/**
 * Detach media from one entity — the gallery, a craft, a story's workshop
 * media — and delete the underlying file only if nothing else still points at
 * it. This is what "remove this item" means from a listing: the same file can
 * be attached in several places (a photo picked from the gallery and also shown
 * on a craft), and deleting the file outright would silently strip it from all
 * of them. DELETE /api/media/[id] remains the way to destroy a file deliberately.
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const { id } = await params

        const attachment = await prisma.mediaAttachment.findUnique({
            where: { id },
            select: { id: true, mediaId: true, entityType: true, entityId: true },
        })
        if (!attachment) return errorResponse('Attachment not found', 404)

        if (session!.user.role !== 'ADMIN') {
            const ownerUserId = await resolveEntityOwner(
                attachment.entityType,
                attachment.entityId,
            )
            if (!ownerUserId || ownerUserId !== session!.user.id) {
                return errorResponse('Forbidden', 403)
            }
        }

        await prisma.mediaAttachment.delete({ where: { id } })

        // Reference-aware, and must run after the delete above has committed so
        // this attachment no longer counts as a reference. A file still used
        // elsewhere is kept; an orphaned one is removed along with any audio its
        // captions extracted.
        await deleteMediaFiles([attachment.mediaId])

        return NextResponse.json({ message: 'Attachment removed successfully' })
    } catch (error) {
        console.error('Error removing media attachment:', error)
        return errorResponse('Failed to remove media attachment', 500)
    }
}
