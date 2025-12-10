import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
        return NextResponse.json({ error: 'Failed to fetch data record' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { name, description, data } = body

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
        console.error('Error updating data record:', error)
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Data record not found' }, { status: 404 })
        }
        return NextResponse.json({ error: 'Failed to update data record' }, { status: 500 })
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
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Data record not found' }, { status: 404 })
        }
        return NextResponse.json({ error: 'Failed to delete data record' }, { status: 500 })
    }
}
