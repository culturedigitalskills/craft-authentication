import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import s3Client, { BUCKET_NAME, initGarage } from '@/lib/object-store'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { fileUploadSchema, resolveMimeType } from '@/lib/validations/media'
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
        // Falls back to the extension when the browser reported no usable type,
        // so the stored row is never classified as an image by default.
        const mimeType = resolveMimeType(file.name, file.type)

        let uploadBuffer = Buffer.from(await file.arrayBuffer()) as Buffer
        let fileSize = file.size

        if (mimeType.startsWith('image/')) {
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
                            mimeType
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

        // Storage first, then the row. These cannot be made atomic: S3 does not
        // join a database transaction, so wrapping them only ever guaranteed
        // "no row without an object" while still leaking objects when the
        // commit failed. Worse, it held an interactive transaction open for the
        // whole upload, which blows Prisma's 5s default on large videos and
        // fails the request outright. This order keeps that guarantee without
        // the timeout, and cleans up the object if the row cannot be written.
        const putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
            Body: uploadBuffer,
            ContentType: mimeType,
            Metadata: {
                'original-name': file.name,
            },
        })
        await s3Client.send(putCommand)

        let mediaFile
        try {
            mediaFile = await prisma.mediaFile.create({
                data: {
                    id: fileId,
                    filename: objectKey,
                    originalName: file.name,
                    mimeType,
                    size: fileSize,
                    bucket: BUCKET_NAME,
                    objectKey,
                    uploaderId: session!.user.id,
                },
            })
        } catch (dbError) {
            await s3Client
                .send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey }))
                .catch((cleanupError) =>
                    console.error('Failed to clean up orphaned object', objectKey, cleanupError),
                )
            throw dbError
        }

        return NextResponse.json(mediaFile, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error uploading file:', error)
        return errorResponse('Failed to upload file', 500)
    }
}
