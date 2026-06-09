'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { UserSecretsService } from '@/lib/user-secrets-service'
import { C2PAService } from '@/lib/c2pa-service'
import s3Client, { BUCKET_NAME, initGarage } from '@/lib/object-store'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'

const GenerateImageArgsSchema = z.object({
    prompt: z.string().min(1),
    model: z.string().default('sourceful/riverflow-v2.5-pro:free'),
    width: z.number().int().positive().optional().default(1024),
    height: z.number().int().positive().optional().default(1024),
})

export type GenerateImageArgs = z.infer<typeof GenerateImageArgsSchema>

export async function createTaskEventAction(
    prompt: string,
    model: string = 'sourceful/riverflow-v2.5-pro:free',
) {
    const session = await auth()
    if (!session?.user) throw new Error('Not authenticated')

    const taskEvent = await prisma.taskEvent.create({
        data: {
            userId: session.user.id,
            type: 'image-generation',
            settings: {
                prompt,
                model,
                width: 1024,
                height: 1024,
            },
        },
    })

    return taskEvent
}

export async function cancelTaskEventAction(eventId: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Not authenticated')

    const task = await prisma.taskEvent.findFirst({
        where: { id: eventId, userId: session.user.id },
    })
    if (!task) throw new Error('Task not found')

    if (task.receivedAt || task.errorAt) {
        throw new Error('Cannot cancel a completed or failed task')
    }

    const updated = await prisma.taskEvent.update({
        where: { id: eventId },
        data: { canceledAt: new Date() },
    })

    return updated
}

export async function getTaskEventsAction() {
    const session = await auth()
    if (!session?.user) throw new Error('Not authenticated')

    const events = await prisma.taskEvent.findMany({
        where: { userId: session.user.id, type: 'image-generation' },
        orderBy: { createdAt: 'desc' },
        include: { mediaFile: true },
    })

    return events
}

export async function deleteTaskEventMediaAction(eventId: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Not authenticated')

    const task = await prisma.taskEvent.findFirst({
        where: { id: eventId, userId: session.user.id },
        include: { mediaFile: true },
    })
    if (!task) throw new Error('Task not found')

    if (task.mediaFileId) {
        const fileData = task.mediaFile
        if (fileData) {
            await prisma.$transaction(async (tx) => {
                // Remove reference from taskEvent
                await tx.taskEvent.update({
                    where: { id: eventId },
                    data: {
                        mediaFileId: null,
                        errorAt: new Date(),
                        errorMessage: 'Deleted By User',
                    },
                })

                // Delete from database
                await tx.mediaFile.delete({ where: { id: fileData.id } })

                // Delete from Garage storage
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: fileData.objectKey,
                })
                await s3Client.send(deleteCommand)
            })
        }
    } else {
        await prisma.taskEvent.update({
            where: { id: eventId },
            data: {
                errorAt: new Date(),
                errorMessage: 'Deleted By User',
            },
        })
    }

    return { success: true }
}

export async function generateImageAction(eventId: string) {
    const session = await auth()
    if (!session?.user) throw new Error('Not authenticated')
    const userId = session.user.id

    const task = await prisma.taskEvent.findFirst({
        where: { id: eventId, userId },
    })
    if (!task) throw new Error('Task not found')

    // Mark as sent immediately
    await prisma.taskEvent.update({
        where: { id: eventId },
        data: {
            sentAt: new Date(),
            errorAt: null,
            errorMessage: null,
            receivedAt: null,
            canceledAt: null,
        },
    })

    // Kick off the generation asynchronously in the background
    runGenerationInBackground(eventId, userId).catch((err) => {
        console.error('Unhandled background generation error:', err)
    })

    return { success: true }
}

async function runGenerationInBackground(eventId: string, userId: string) {
    try {
        const task = await prisma.taskEvent.findUnique({ where: { id: eventId } })
        if (!task) return
        if (task.canceledAt) return

        const settings = task.settings as any
        const prompt = settings.prompt
        const model = settings.model || 'sourceful/riverflow-v2.5-pro:free'
        const width = settings.width || 1024
        const height = settings.height || 1024

        // 1. Get API Key
        const apiKey = await UserSecretsService.getDecryptedSecret(
            userId,
            'OPENROUTER_API_KEY',
        ).catch(() => null)
        if (!apiKey) {
            throw new Error('OpenRouter API key not configured in vault')
        }

        let imageBuffer: Buffer
        let mimeType = 'image/png'

        // 2. Generation / Simulation
        if (apiKey === 'DEVELOP') {
            // Simulated delay
            await new Promise((resolve) => setTimeout(resolve, 2000))

            // Re-check cancellation
            const currentTask = await prisma.taskEvent.findUnique({ where: { id: eventId } })
            if (currentTask?.canceledAt) return

            // Read mock image
            const mockPath = path.join(process.cwd(), 'public', 'test', 'generation_mock.png')
            if (!fs.existsSync(mockPath)) {
                throw new Error(`Mock image not found at: ${mockPath}`)
            }

            // add a brief delay to simulate file reading time
            await new Promise((resolve) => setTimeout(resolve, 5000))

            imageBuffer = await fs.promises.readFile(mockPath)
        } else {
            // Real OpenRouter Call
            const { OpenRouter } = await import('@openrouter/sdk')
            const openrouter = new OpenRouter({ apiKey })

            // OpenRouter image generation uses chat completions with modalities: ["image"]
            const response = await openrouter.chat.send({
                chatRequest: {
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    modalities: ['image'],
                },
            })

            const choices = response.choices as any
            const message = choices?.[0]?.message
            const imageObj =
                message?.images?.[0] ||
                message?.imageUrl ||
                message?.image_url ||
                (message?.content && message.content.startsWith('data:image')
                    ? { url: message.content }
                    : null)
            const imgUrl =
                imageObj?.imageUrl?.url ||
                imageObj?.image_url?.url ||
                imageObj?.url ||
                message?.content

            if (!imgUrl || !imgUrl.startsWith('data:image')) {
                throw new Error('Failed to retrieve generated image data from OpenRouter response')
            }

            const match = imgUrl.match(/^data:([^;]+);base64,/)
            if (match) {
                mimeType = match[1]
            }
            const base64Data = imgUrl.split(',')[1]
            imageBuffer = Buffer.from(base64Data, 'base64')
        }

        // Re-check cancellation
        const taskCheck = await prisma.taskEvent.findUnique({ where: { id: eventId } })
        if (taskCheck?.canceledAt) return

        // Initialize S3 Garage Client
        await initGarage()

        const fileId = randomUUID()
        const extension = mimeType === 'image/jpeg' ? '.jpg' : '.png'
        const objectKey = `${fileId}${extension}`

        let uploadBuffer = imageBuffer
        let fileSize = imageBuffer.byteLength

        // 3. Optional C2PA signing
        const hasC2PACreds = await prisma.userSecrets.count({
            where: { userId, type: { in: ['C2PA_PRIV', 'C2PA_PUB'] } },
        })

        if (hasC2PACreds === 2) {
            try {
                const manifestInfo = await C2PAService.inspectManifest(imageBuffer)
                let signedBuffer: Buffer

                const comissionDetails = {
                    service: 'OpenRouter',
                    model,
                    size: `${width}x${height}`,
                    prompt,
                }
                if (manifestInfo.hasManifest) {
                    // Image already has a C2PA manifest (e.g. from the model generator itself).
                    // Record that it was commissioned by our user by adding a new edit manifest.
                    signedBuffer = await C2PAService.addCommissionManifest(
                        userId,
                        imageBuffer,
                        mimeType,
                        comissionDetails,
                    )
                } else {
                    // Clean image, initialize a new manifest where the user is the creator.
                    signedBuffer = await C2PAService.initializeManifest(
                        userId,
                        imageBuffer,
                        mimeType,
                        comissionDetails,
                    )
                }
                uploadBuffer = signedBuffer
                fileSize = signedBuffer.byteLength
            } catch (err) {
                console.error('Failed to sign generated image with C2PA:', err)
            }
        }

        // 4. Save and Upload
        const mediaFile = await prisma.$transaction(async (tx) => {
            const createdFile = await tx.mediaFile.create({
                data: {
                    id: fileId,
                    filename: objectKey,
                    originalName: `openrouter-${Date.now()}${extension}`,
                    mimeType,
                    size: fileSize,
                    bucket: BUCKET_NAME,
                    objectKey,
                    uploaderId: userId,
                },
            })

            const putCommand = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: objectKey,
                Body: uploadBuffer,
                ContentType: mimeType,
            })
            await s3Client.send(putCommand)

            return createdFile
        })

        // 5. Complete task
        await prisma.taskEvent.update({
            where: { id: eventId },
            data: {
                receivedAt: new Date(),
                mediaFileId: mediaFile.id,
            },
        })
    } catch (error: any) {
        console.error(`Generation failed for event ${eventId}:`, error)
        await prisma.taskEvent
            .update({
                where: { id: eventId },
                data: {
                    errorAt: new Date(),
                    errorMessage: error.message || 'Unknown generation error',
                },
            })
            .catch((err) => {
                console.error('Failed to update TaskEvent with error status:', err)
            })
    }
}
