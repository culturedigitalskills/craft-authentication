import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/validations/types'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ countryId: string }> }
) {
    try {
        const { countryId } = await params

        const regions = await prisma.region.findMany({
            where: { countryId },
            select: { id: true, name: true, regionType: true },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json({ regions })
    } catch (error) {
        console.error('Error fetching regions:', error)
        return errorResponse('Failed to fetch regions', 500)
    }
}
