import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(request: NextRequest) {
    const { unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const q = request.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) {
        return NextResponse.json([])
    }

    const artisans = await prisma.artisan.findMany({
        where: {
            deletedAt: null,
            OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
            ],
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            slug: true,
        },
        take: 10,
        orderBy: { firstName: 'asc' },
    })

    return NextResponse.json(artisans)
}
