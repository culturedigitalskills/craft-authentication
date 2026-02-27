import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateMediaAttachmentSchema } from '@/lib/validations/media'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'

export async function POST(request: NextRequest) {
    const { unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const body = await request.json()
        const validatedData = CreateMediaAttachmentSchema.parse(body)

        // Remove existing primary attachment for this entity if replacing
        if (validatedData.isPrimary) {
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
                displayOrder: validatedData.displayOrder,
            },
        })

        return NextResponse.json(attachment, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error creating media attachment:', error)
        return errorResponse('Failed to create media attachment', 500)
    }
}
