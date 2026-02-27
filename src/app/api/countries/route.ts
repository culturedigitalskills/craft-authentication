import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/validations/types'

export async function GET() {
    try {
        const countries = await prisma.country.findMany({
            select: { id: true, isoCode: true, name: true },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json({ countries })
    } catch (error) {
        console.error('Error fetching countries:', error)
        return errorResponse('Failed to fetch countries', 500)
    }
}
