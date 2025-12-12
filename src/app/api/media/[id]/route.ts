import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import s3Client, { BUCKET_NAME } from '@/lib/object-store'
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { errorResponse } from '@/lib/validations/types'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const fileData = await prisma.mediaFile.findUnique({ where: { id } })

        if (!fileData) {
            return errorResponse('File not found', 404)
        }

        const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileData.objectKey,
        })
        const response = await s3Client.send(getCommand)

        const stream = response.Body as any

        const headers = new Headers()
        headers.set('Content-Type', fileData.mimeType)
        headers.set('Content-Disposition', `inline; filename="${fileData.originalName}"`)
        // This assumes, that the media files are immutable and allways public meaning that access
        // is not restricted by authentication or other permission checks.
        headers.set('Cache-Control', 'public, max-age=31536000')

        return new NextResponse(stream, { headers })
    } catch (error) {
        console.error('Error retrieving file:', error)
        return errorResponse('Failed to retrieve file', 500)
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params
        const fileData = await prisma.mediaFile.findUnique({ where: { id } })

        if (!fileData) {
            return errorResponse('File not found', 404)
        }

        // Delete from Garage
        const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileData.objectKey,
        })
        await s3Client.send(deleteCommand)

        // Delete from database
        await prisma.mediaFile.delete({ where: { id } })

        return NextResponse.json({ message: 'File deleted successfully' })
    } catch (error) {
        console.error('Error deleting file:', error)
        return errorResponse('Failed to delete file', 500)
    }
}
