import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''

        const skip = (page - 1) * limit

        const where = search
            ? {
                  OR: [
                      { name: { contains: search, mode: 'insensitive' as const } },
                      { description: { contains: search, mode: 'insensitive' as const } },
                  ],
              }
            : {}

        const [data, totalCount] = await Promise.all([
            prisma.dataRecord.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.dataRecord.count({ where }),
        ])

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
        console.error('Error fetching data records:', error)
        return NextResponse.json({ error: 'Failed to fetch data records' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description, data } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const record = await prisma.dataRecord.create({
            data: {
                name,
                description,
                data,
            },
        })

        return NextResponse.json(record, { status: 201 })
    } catch (error) {
        console.error('Error creating data record:', error)
        return NextResponse.json({ error: 'Failed to create data record' }, { status: 500 })
    }
}
