import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import s3Client, { BUCKET_NAME, initGarage } from '@/lib/object-store'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { fileUploadSchema } from '@/lib/validations/media'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'

import { C2PAService } from '@/lib/c2pa-service'

export async function POST(request: NextRequest) {
    const { session, unauthorized } = await requireAuth()
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

        let uploadBuffer = Buffer.from(await file.arrayBuffer()) as Buffer
        let fileSize = file.size

        if (file.type.startsWith('image/')) {
            try {
                const manifestResult = await C2PAService.inspectManifest(uploadBuffer)
                if (manifestResult.hasManifest) {
                    if (!manifestResult.authentic) {
                        return errorResponse(
                            "This image contains invalid or tampered content credentials and cannot be accepted.",
                            403
                        )
                    }
                    if (manifestResult.creatorUserId !== session!.user.id) {
                        return errorResponse(
                            "This image contains content credentials from a different creator. To respect authorship and prevent copying, we cannot accept uploads of other creators' works.",
                            403
                        )
                    }
                } else {
                    // Check if C2PA is set up for the user
                    const userSecretsCount = await prisma.userSecrets.count({
                        where: { userId: session!.user.id, type: { in: ['C2PA_PRIV', 'C2PA_PUB'] } }
                    })
                    if (userSecretsCount === 2) {
                        const signedBuffer = await C2PAService.initializeManifest(
                            session!.user.id,
                            uploadBuffer,
                            file.type
                        )
                        uploadBuffer = signedBuffer
                        fileSize = signedBuffer.byteLength
                    }
                }
            } catch (err: any) {
                console.error('C2PA processing error:', err)
                if (err.message && err.message.includes('creator')) {
                    return errorResponse(err.message, 403)
                }
                return errorResponse(err.message || 'C2PA processing failed', 500)
            }
        }

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
                    size: fileSize,
                    bucket: BUCKET_NAME,
                    objectKey,
                    uploaderId: session!.user.id,
                },
            })

            // Upload to Garage
            // If this fails, the transaction will rollback
            const putCommand = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: objectKey,
                Body: uploadBuffer,
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
