import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { CreateCraftSchema, craftQuerySchema } from '@/lib/validations/craft'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import {
    issueCraftVC,
    setCraftMedia,
    findUnownedMedia,
    getCraftPrimaryImageMap,
} from '@/lib/craft'

export async function GET(request: NextRequest) {
    try {
        const { page, limit, search } = craftQuerySchema.parse(
            Object.fromEntries(request.nextUrl.searchParams),
        )
        const skip = (page - 1) * limit

        const where = {
            isPublic: true,
            deletedAt: null,
            ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
        }

        const [crafts, totalCount] = await Promise.all([
            prisma.craft.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    material: true,
                    createdAt: true,
                    artisan: { select: { firstName: true, lastName: true, slug: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.craft.count({ where }),
        ])

        const imageMap = await getCraftPrimaryImageMap(crafts.map(c => c.id))
        const data = crafts.map(c => ({
            id: c.id,
            title: c.title,
            material: c.material,
            createdAt: c.createdAt,
            artisanName: `${c.artisan.firstName} ${c.artisan.lastName}`,
            artisanSlug: c.artisan.slug,
            imageUrl: imageMap.has(c.id) ? `/api/media/${imageMap.get(c.id)}` : null,
        }))

        const totalPages = Math.ceil(totalCount / limit)
        return NextResponse.json({
            data,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        })
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Error fetching crafts:', error)
        return errorResponse('Failed to fetch crafts', 500)
    }
}

export async function POST(request: NextRequest) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const body = await request.json()
        const input = CreateCraftSchema.parse(body)

        // Owner is the caller's artisan profile — never trusted from the client.
        const artisan = await prisma.artisan.findUnique({
            where: { userId: session!.user.id },
            select: { id: true, slug: true },
        })
        if (!artisan) return errorResponse('Artisan profile required', 409)

        const mediaIds = input.mediaIds ?? []
        const unowned = await findUnownedMedia(mediaIds, session!.user.id)
        if (unowned.length > 0) {
            return errorResponse('You do not own one or more of the referenced media files', 403)
        }

        const craft = await prisma.craft.create({
            data: {
                artisanId: artisan.id,
                title: input.title,
                description: input.description,
                material: input.material,
                isPublic: input.isPublic,
                isSharedLocation: input.isSharedLocation,
                latitude: input.latitude ?? null,
                longitude: input.longitude ?? null,
                place: input.place ?? null,
                videos: input.videos ?? [],
            },
        })

        await setCraftMedia(craft.id, mediaIds)

        // Issue the provenance credential (non-fatal — craft still succeeds).
        try {
            await issueCraftVC({
                id: craft.id,
                title: craft.title,
                description: craft.description,
                artisanSlug: artisan.slug,
                createdAt: craft.createdAt,
                firstMediaId: mediaIds[0] ?? null,
            })
        } catch (vcError) {
            console.error('VC issuance failed for craft', craft.id, vcError)
        }

        return NextResponse.json(craft, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Error creating craft:', error)
        return errorResponse('Failed to create craft', 500)
    }
}
