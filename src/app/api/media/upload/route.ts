import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import s3Client, { BUCKET_NAME, initGarage } from '@/lib/object-store'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { fileUploadSchema } from '@/lib/validations/media'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
    try {
        // Initialize Garage bucket if needed
        await initGarage()

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return errorResponse('No file uploaded', 400)
        }

        // Validate file with Zod
        const validation = fileUploadSchema.safeParse({ file })
        if (!validation.success) {
            return handleValidationError(validation.error)
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
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error uploading file:', error)
        return errorResponse('Failed to upload file', 500)
    }
}
