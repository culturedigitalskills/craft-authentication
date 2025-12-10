import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import s3Client, { BUCKET_NAME, initGarage } from '@/lib/object-store'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const ALLOWED_EXTENSIONS = /\.(jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv|flv|webm|mkv)$/i
const MAX_FILE_SIZE = (parseInt(process.env.MAX_MEDIA_SIZE ?? '100') || 100) * 1024 * 1024 // 100MB

async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
    const fileExtension = file.name.split('.').pop()
    const ext = `.${fileExtension}`

    if (!ALLOWED_EXTENSIONS.test(ext)) {
        return {
            valid: false,
            error: 'Only image and video files are allowed',
        }
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size exceeds maximum of ${process.env.MAX_MEDIA_SIZE || 100}MB`,
        }
    }

    return { valid: true }
}

export async function POST(request: NextRequest) {
    try {
        // Initialize Garage bucket if needed
        await initGarage()

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        const validation = await validateFile(file)
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        const fileId = randomUUID()
        const fileExtension = `.${file.name.split('.').pop()}`
        const objectKey = `${fileId}${fileExtension}`

        const buffer = await file.arrayBuffer()

        // Upload to Garage
        const putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
            Body: Buffer.from(buffer),
            ContentType: file.type,
            Metadata: {
                'original-name': file.name,
            },
        })
        await s3Client.send(putCommand)

        // Save metadata to database
        const mediaFile = await prisma.mediaFile.create({
            data: {
                id: fileId,
                filename: objectKey,
                originalName: file.name,
                mimeType: file.type,
                size: file.size,
                bucket: BUCKET_NAME,
                objectKey,
            },
        })

        return NextResponse.json(
            {
                message: 'File uploaded successfully',
                file: mediaFile,
            },
            { status: 201 },
        )
    } catch (error) {
        console.error('Error uploading file:', error)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }
}
