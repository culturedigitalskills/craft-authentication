import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/validations/types'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'
import { ZodError } from 'zod'
import { handleValidationError } from '@/lib/validations/types'

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
