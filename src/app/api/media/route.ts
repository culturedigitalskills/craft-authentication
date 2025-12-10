import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const type = searchParams.get('type')

        const skip = (page - 1) * limit

        let where: any = {}
        if (type) {
            const typeFilter = type === 'image' ? 'image/' : type === 'video' ? 'video/' : null
            if (typeFilter) {
                where = { mimeType: { startsWith: typeFilter } }
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
        console.error('Error listing media files:', error)
        return NextResponse.json({ error: 'Failed to list media files' }, { status: 500 })
    }
}
