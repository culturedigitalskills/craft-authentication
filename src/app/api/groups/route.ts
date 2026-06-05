import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateGroupSchema } from '@/lib/validations/group'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const search = searchParams.get('search') || undefined
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12')))
        const skip = (page - 1) * limit

        const where = {
            isActive: true,
            ...(search
                ? {
                      OR: [
                          { name: { contains: search, mode: 'insensitive' as const } },
                          { description: { contains: search, mode: 'insensitive' as const } },
                          { location: { contains: search, mode: 'insensitive' as const } },
                      ],
                  }
                : {}),
        }

        const [groups, totalCount] = await Promise.all([
            prisma.group.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take: limit,
                include: {
                    _count: { select: { memberships: true } },
                },
            }),
            prisma.group.count({ where }),
        ])

        const totalPages = Math.ceil(totalCount / limit)

        return NextResponse.json({
            data: groups,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        })
    } catch (error) {
        console.error('Error fetching groups:', error)
        return errorResponse('Failed to fetch groups', 500)
    }
}

export async function POST(request: NextRequest) {
    const { session, unauthorized } = await requireAdmin()
    if (unauthorized) return unauthorized

    try {
        const body = await request.json()
        const validatedData = CreateGroupSchema.parse(body)

        const baseSlug = validatedData.name
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')

        let slug = baseSlug
        let slugExists = await prisma.group.findUnique({ where: { slug } })
        let counter = 1
        while (slugExists) {
            slug = `${baseSlug}-${counter}`
            slugExists = await prisma.group.findUnique({ where: { slug } })
            counter++
        }

        const group = await prisma.group.create({
            data: {
                name: validatedData.name,
                slug,
                description: validatedData.description,
                website: validatedData.website || null,
                location: validatedData.location,
                organizationType: validatedData.organizationType,
                certifications: validatedData.certifications,
                isHeritageCraft: validatedData.isHeritageCraft,
                isOpenToMembers: validatedData.isOpenToMembers,
                hasTrainingProgram: validatedData.hasTrainingProgram,
            },
        })

        // Make the creating admin's artisan profile a group admin if they have one
        const artisan = await prisma.artisan.findUnique({
            where: { userId: session!.user.id },
            select: { id: true },
        })
        if (artisan) {
            await prisma.artisanGroupMembership.create({
                data: {
                    artisanId: artisan.id,
                    groupId: group.id,
                    role: 'ADMIN',
                },
            })
        }

        return NextResponse.json(group, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error creating group:', error)
        return errorResponse('Failed to create group', 500)
    }
}
