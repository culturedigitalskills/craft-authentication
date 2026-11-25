import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BUCKET_NAME, initGarage } from '@/lib/object-store'
import { storeNewMedia } from '@/lib/store-new-media'
import { randomUUID } from 'crypto'
import { fileUploadSchema, resolveMimeType } from '@/lib/validations/media'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireActiveArtisan } from '@/lib/auth-guard'

import { C2PAService } from '@/lib/c2pa-service'

export async function POST(request: NextRequest) {
    const { session, unauthorized } = await requireActiveArtisan()
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

        const mediaFile = await storeNewMedia({
            id: fileId, filename: objectKey, originalName: file.name, mimeType,
            size: fileSize, bucket: BUCKET_NAME, objectKey, uploaderId: session!.user.id,
        }, uploadBuffer, { 'original-name': file.name })

        return NextResponse.json(mediaFile, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error uploading file:', error)
        return errorResponse('Failed to upload file', 500)
    }
}
