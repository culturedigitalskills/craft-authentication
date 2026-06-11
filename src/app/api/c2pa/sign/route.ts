import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import s3Client, { BUCKET_NAME, initGarage } from '@/lib/object-store'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { C2PAService } from '@/lib/c2pa-service'
import { z } from 'zod'

const SignRequestSchema = z.object({
    mediaId: z.string(),
    assertionType: z.enum(['initialize', 'edit']),
    editDetails: z.string().optional(),
})

export async function POST(request: Request) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const userId = session!.user.id

    try {
        const body = await request.json()
        const result = SignRequestSchema.safeParse(body)
        
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const { mediaId, assertionType, editDetails } = result.data

        // 1. Fetch the media file record from DB
        const mediaFile = await prisma.mediaFile.findUnique({
            where: { id: mediaId }
        })

        if (!mediaFile) {
            return NextResponse.json({ error: 'Media file not found' }, { status: 404 })
        }

        if (mediaFile.uploaderId !== userId) {
            return NextResponse.json({ 
                error: 'Unauthorized: You are not the creator of this media file.' 
            }, { status: 403 })
        }

        // Initialize S3/Garage client
        await initGarage()

        // 2. Fetch file bytes from S3
        const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: mediaFile.objectKey,
        })
        const s3Response = await s3Client.send(getCommand)
        const bodyStream = s3Response.Body
        if (!bodyStream) {
            return NextResponse.json({ error: 'Failed to retrieve media file content' }, { status: 500 })
        }
        
        const mediaBuffer = Buffer.from(await bodyStream.transformToByteArray())

        // 3. Perform C2PA Manifest Signing or Editing
        let signedBuffer: Buffer
        if (assertionType === 'initialize') {
            signedBuffer = await C2PAService.initializeManifest(
                userId,
                mediaBuffer,
                mediaFile.mimeType
            )
        } else {
            if (!editDetails) {
                return NextResponse.json({ error: 'editDetails is required for edit assertions' }, { status: 400 })
            }
            signedBuffer = await C2PAService.addEditAssertion(
                userId,
                mediaBuffer,
                mediaFile.mimeType,
                editDetails
            )
        }

        // 4. Upload the signed buffer back to S3
        const putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: mediaFile.objectKey,
            Body: signedBuffer,
            ContentType: mediaFile.mimeType,
            Metadata: {
                'original-name': mediaFile.originalName,
                'c2pa-signed': 'true',
            },
        })
        await s3Client.send(putCommand)

        // 5. Update media file size in DB
        const updatedMedia = await prisma.mediaFile.update({
            where: { id: mediaId },
            data: { size: signedBuffer.byteLength }
        })

        return NextResponse.json({ success: true, size: updatedMedia.size })

    } catch (error: any) {
        console.error('Error signing media file:', error)
        if (error.message && error.message.includes('creator')) {
            return NextResponse.json({ error: error.message }, { status: 403 })
        }
        return NextResponse.json({ error: error.message || 'Failed to sign media file' }, { status: 500 })
    }
}
