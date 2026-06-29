import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateArtisanSchema } from '@/lib/validations/artisan'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'
import { generateUniqueSlug } from '@/lib/slug'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '12', 10)))
        const skip = (page - 1) * limit

        const [artisans, totalCount] = await Promise.all([
            prisma.artisan.findMany({
                where: { deletedAt: null },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    slug: true,
                    bio: true,
                    country: true,
                    region: true,
                    yearsOfExperience: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.artisan.count({ where: { deletedAt: null } }),
        ])

        const artisanIds = artisans.map(a => a.id)
        const photoAttachments = artisanIds.length > 0
            ? await prisma.mediaAttachment.findMany({
                where: {
                    entityType: 'Artisan',
                    entityId: { in: artisanIds },
                    attachmentType: 'HERO',
                    isPrimary: true,
                },
                select: { entityId: true, mediaId: true },
            })
            : []

        const photoMap = new Map(photoAttachments.map(a => [a.entityId, a.mediaId]))

        const data = artisans.map(a => ({
            ...a,
            photoUrl: photoMap.has(a.id) ? `/api/media/${photoMap.get(a.id)}` : null,
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
        console.error('Error fetching artisans:', error)
        return errorResponse('Failed to fetch artisans', 500)
    }
}

export async function POST(request: NextRequest) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const body = await request.json()
        const validatedData = CreateArtisanSchema.parse(body)

        const existing = await prisma.artisan.findUnique({
            where: { userId: session!.user.id },
        })
        if (existing) {
            return errorResponse('Artisan profile already exists', 409)
        }

        const slug = await generateUniqueSlug('artisan', `${validatedData.firstName}-${validatedData.lastName}`)

        const artisan = await prisma.artisan.create({
            data: {
                userId: session!.user.id,
                firstName: validatedData.firstName,
                lastName: validatedData.lastName,
                bio: validatedData.bio,
                yearsOfExperience: validatedData.yearsOfExperience,
                learningSource: validatedData.learningSource,
                country: validatedData.country,
                region: validatedData.region,
                slug,
                socialInstagram: validatedData.socialInstagram,
                socialFacebook: validatedData.socialFacebook,
                socialTwitter: validatedData.socialTwitter,
                socialTiktok: validatedData.socialTiktok,
                socialYoutube: validatedData.socialYoutube,
                website: validatedData.website,
                hashtags: validatedData.hashtags ?? [],
            },
        })

        return NextResponse.json(artisan, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error creating artisan profile:', error)
        return errorResponse('Failed to create artisan profile', 500)
    }
}
