import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateDataRecordSchema } from '@/lib/validations/data'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const record = await prisma.dataRecord.findUnique({ where: { id } })

        if (!record) {
            return NextResponse.json({ error: 'Data record not found' }, { status: 404 })
        }

        return NextResponse.json(record)
    } catch (error) {
        console.error('Error fetching data record:', error)
        return errorResponse('Failed to fetch data record', 500)
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const validatedData = updateDataRecordSchema.parse(body)
        const { name, description, data } = validatedData

        const record = await prisma.dataRecord.update({
            where: { id },
            data: {
                name,
                description,
                data,
                updatedAt: new Date(),
            },
        })

        return NextResponse.json(record)
    } catch (error: any) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error updating data record:', error)
        return errorResponse('Failed to update data record', 500)
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params
        const record = await prisma.dataRecord.delete({ where: { id } })

        return NextResponse.json({
            message: 'Data record deleted successfully',
            data: record,
        })
    } catch (error: any) {
        console.error('Error deleting data record:', error)
        return errorResponse('Failed to delete data record', 500)
    }
}
