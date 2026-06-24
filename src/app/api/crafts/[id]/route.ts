import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-guard'
import { UpdateCraftSchema } from '@/lib/validations/craft'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { deleteMediaFiles } from '@/lib/media-delete'
import {
    issueCraftVC,
    deleteCraftVC,
    setCraftMedia,
    getCraftMediaIds,
    findUnownedMedia,
    CRAFT_ENTITY_TYPE,
} from '@/lib/craft'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const craft = await prisma.craft.findFirst({
            where: { id, deletedAt: null },
            include: {
                artisan: { select: { userId: true, firstName: true, lastName: true, slug: true } },
            },
        })
        if (!craft) return errorResponse('Craft not found', 404)

        // Private crafts are only visible to their owner or a site admin.
        if (!craft.isPublic) {
            const session = await auth()
            const isOwner = session?.user?.id === craft.artisan.userId
            const isAdmin = session?.user?.role === 'ADMIN'
            if (!isOwner && !isAdmin) return errorResponse('Craft not found', 404)
        }

        const mediaIds = await getCraftMediaIds(id)
        return NextResponse.json({ ...craft, mediaIds })
    } catch (error) {
        console.error('Error fetching craft:', error)
        return errorResponse('Failed to fetch craft', 500)
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const { id } = await params
        const input = UpdateCraftSchema.parse(await request.json())

        const craft = await prisma.craft.findUnique({
            where: { id },
            include: { artisan: { select: { userId: true, slug: true } } },
        })
        if (!craft || craft.deletedAt) return errorResponse('Craft not found', 404)
        if (craft.artisan.userId !== session!.user.id && session!.user.role !== 'ADMIN') {
            return errorResponse('Forbidden', 403)
        }

        if (input.mediaIds) {
            const unowned = await findUnownedMedia(input.mediaIds, session!.user.id)
            if (unowned.length > 0) {
                return errorResponse('You do not own one or more of the referenced media files', 403)
            }
        }

        const updated = await prisma.craft.update({
            where: { id },
            data: {
                title: input.title,
                description: input.description,
                materials: input.materials,
                technique: input.technique,
                timeToMake: input.timeToMake,
                width: input.width,
                height: input.height,
                depth: input.depth,
                dimensionUnit: input.dimensionUnit,
                weight: input.weight,
                weightUnit: input.weightUnit,
                inspiration: input.inspiration,
                careInstructions: input.careInstructions,
                isPublic: input.isPublic,
                isSharedLocation: input.isSharedLocation,
                latitude: input.latitude,
                longitude: input.longitude,
                place: input.place,
                videos: input.videos,
            },
        })

        // Reconcile media if the client sent a list, GC anything dropped.
        if (input.mediaIds) {
            const removed = await setCraftMedia(id, input.mediaIds)
            if (removed.length > 0) void deleteMediaFiles(removed)
        }

        // Re-issue the credential so its subject stays accurate after edits.
        try {
            const orderedMedia = await getCraftMediaIds(id)
            await issueCraftVC({
                id: updated.id,
                title: updated.title,
                description: updated.description,
                artisanSlug: craft.artisan.slug,
                createdAt: updated.createdAt,
                firstMediaId: orderedMedia[0] ?? null,
            })
        } catch (vcError) {
            console.error('VC re-issuance failed for craft', id, vcError)
        }

        return NextResponse.json(updated)
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Error updating craft:', error)
        return errorResponse('Failed to update craft', 500)
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const { id } = await params
        const craft = await prisma.craft.findUnique({
            where: { id },
            include: { artisan: { select: { userId: true } } },
        })
        if (!craft) return errorResponse('Craft not found', 404)
        if (craft.artisan.userId !== session!.user.id && session!.user.role !== 'ADMIN') {
            return errorResponse('Forbidden', 403)
        }

        // Collect media before removing attachments so we can GC the files.
        const mediaIds = await getCraftMediaIds(id)
        await prisma.mediaAttachment.deleteMany({
            where: { entityType: CRAFT_ENTITY_TYPE, entityId: id },
        })
        await prisma.craft.delete({ where: { id } })

        await deleteCraftVC(id)
        if (mediaIds.length > 0) await deleteMediaFiles(mediaIds)

        return NextResponse.json({ message: 'Craft deleted successfully' })
    } catch (error) {
        console.error('Error deleting craft:', error)
        return errorResponse('Failed to delete craft', 500)
    }
}
