import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import s3Client, { BUCKET_NAME } from '@/lib/object-store'
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { errorResponse } from '@/lib/validations/types'
import { requireAuth } from '@/lib/auth-guard'
import { CRAFT_ENTITY_TYPE } from '@/lib/craft'

/**
 * Resolve the owning user of an attachment's entity. Returns null when
 * ownership cannot be established (e.g. Group attachments, unknown types) —
 * those are only deletable by site admins.
 */
async function resolveEntityOwner(entityType: string, entityId: string): Promise<string | null> {
    if (entityType === 'Artisan') {
        const artisan = await prisma.artisan.findUnique({
            where: { id: entityId },
            select: { userId: true },
        })
        return artisan?.userId ?? null
    }
    if (entityType === CRAFT_ENTITY_TYPE) {
        const craft = await prisma.craft.findUnique({
            where: { id: entityId },
            select: { artisan: { select: { userId: true } } },
        })
        return craft?.artisan.userId ?? null
    }
    if (entityType === 'CraftStory') {
        const story = await prisma.craftStory.findUnique({
            where: { id: entityId },
            select: { artisan: { select: { userId: true } } },
        })
        return story?.artisan.userId ?? null
    }
    return null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const fileData = await prisma.mediaFile.findUnique({ where: { id } })

        if (!fileData) {
            return errorResponse('File not found', 404)
        }

        const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileData.objectKey,
        })
        const response = await s3Client.send(getCommand)

        const stream = response.Body as ReadableStream

        const headers = new Headers()
        headers.set('Content-Type', fileData.mimeType)
        headers.set('Content-Disposition', `inline; filename="${fileData.originalName}"`)
        // This assumes, that the media files are immutable and allways public meaning that access
        // is not restricted by authentication or other permission checks.
        headers.set('Cache-Control', 'public, max-age=31536000')

        return new NextResponse(stream, { headers })
    } catch (error) {
        console.error('Error retrieving file:', error)
        return errorResponse('Failed to retrieve file', 500)
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const { id } = await params
        const fileData = await prisma.mediaFile.findUnique({ where: { id } })

        if (!fileData) {
            return errorResponse('File not found', 404)
        }

        // The uploader owns the file. Legacy rows predate uploaderId, so for
        // those we fall back to resolving the owner through the attachment's
        // entity. Site admins may always delete.
        const isAdmin = session!.user.role === 'ADMIN'
        let isOwner = fileData.uploaderId !== null && fileData.uploaderId === session!.user.id
        if (!isOwner && fileData.uploaderId === null) {
            const attachment = await prisma.mediaAttachment.findFirst({
                where: { mediaId: id },
            })
            if (attachment) {
                const ownerUserId = await resolveEntityOwner(
                    attachment.entityType,
                    attachment.entityId,
                )
                isOwner = ownerUserId !== null && ownerUserId === session!.user.id
            }
        }
        if (!isOwner && !isAdmin) {
            return errorResponse('Forbidden', 403)
        }

        // We have two data items for a media file, a database
        // record and the file on garage storage. We use a
        // transaction to reduce the probability that we get
        // orpahed files in sttorage as the DB deletion only
        // commits if storage deletion succeeds
        await prisma.$transaction(async (tx) => {
            // Delete from database (not yet committed)
            await tx.mediaFile.delete({ where: { id } })

            // Delete from Garage storage
            // If this fails, the transaction will rollback
            const deleteCommand = new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: fileData.objectKey,
            })
            await s3Client.send(deleteCommand)

            // If no error was thrown up to now, the transaction
            // will be commited
        })

        return NextResponse.json({ message: 'File deleted successfully' })
    } catch (error) {
        console.error('Error deleting file:', error)
        return errorResponse('Failed to delete file', 500)
    }
}
