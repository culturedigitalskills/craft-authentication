import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import s3Client, { BUCKET_NAME, initGarage } from '@/lib/object-store'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { fileUploadSchema } from '@/lib/validations/media'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'

export async function POST(request: NextRequest) {
    const { unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

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

        // We use a transaction to reduce the liklyhood of
        // orphaned meida files in garage storage
        // If either fails, the transaction rolls back
        const mediaFile = await prisma.$transaction(async (tx) => {
            // Create database record first (not yet committed)
            const createdFile = await tx.mediaFile.create({
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

            // Upload to Garage
            // If this fails, the transaction will rollback
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

            // If no error was thrown up to now, the transaction
            // will be commited
            return createdFile
        })

        return NextResponse.json(mediaFile, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error uploading file:', error)
        return errorResponse('Failed to upload file', 500)
    }
}
