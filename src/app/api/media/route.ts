import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mediaQuerySchema } from '@/lib/validations/media'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(request: NextRequest) {
    const { unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const searchParams = request.nextUrl.searchParams
        const queryParams = mediaQuerySchema.parse(Object.fromEntries(searchParams))

        const { page, limit, type } = queryParams

        const skip = (page - 1) * limit

        const where: { mimeType?: { startsWith: string } } = {}
        if (type) {
            const typeFilter = type === 'image' ? 'image/' : type === 'video' ? 'video/' : null
            if (typeFilter) {
                where.mimeType = { startsWith: typeFilter }
            }
        }

        const [files, totalCount] = await Promise.all([
            prisma.mediaFile.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.mediaFile.count({ where }),
        ])

        const totalPages = Math.ceil(totalCount / limit)

        return NextResponse.json({
            files,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error listing media files:', error)
        return errorResponse('Failed to list media files', 500)
    }
}
