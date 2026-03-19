import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dataQuerySchema, createDataRecordSchema } from '@/lib/validations/data'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const queryParams = dataQuerySchema.parse(Object.fromEntries(searchParams))

        const { page, limit, search } = queryParams

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
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error fetching data records:', error)
        return errorResponse('Failed to fetch data records', 500)
    }
}

export async function POST(request: NextRequest) {
    const { unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const body = await request.json()
        const validatedData = createDataRecordSchema.parse(body)
        const { name, description, data } = validatedData

        const record = await prisma.dataRecord.create({
            data: {
                name,
                description,
                data,
            },
        })

        return NextResponse.json(record, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error creating data record:', error)
        return errorResponse('Failed to create data record', 500)
    }
}
