import { PutObjectCommand } from '@aws-sdk/client-s3'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import storage from '@/lib/object-store'

// Register cleanup before uploading. If the process dies or account erasure
// wins the race, the worker can still locate the object. No DB transaction
// stays open during a potentially large transfer.
export async function storeNewMedia(
    data: Prisma.MediaFileUncheckedCreateInput,
    body: Buffer,
    metadata?: Record<string, string>,
) {
    const target = { bucket: data.bucket, objectKey: data.objectKey }
    const reservation = await prisma.erasureObject.create({
        data: {
            ...target,
            pendingUploaderId: data.uploaderId ?? null,
            retryAt: new Date(Date.now() + 60 * 60 * 1000),
        },
    })
    try {
        await storage.send(
            new PutObjectCommand({
                Bucket: data.bucket,
                Key: data.objectKey,
                Body: body,
                ContentType: data.mimeType,
                Metadata: metadata,
            }),
            { abortSignal: AbortSignal.timeout(15 * 60 * 1000) },
        )
        return await prisma.$transaction(async (tx) => {
            if (data.uploaderId) {
                // Take the owner lock before the reservation lock, just as account deletion does.
                const owner = await tx.$queryRaw<
                    { id: string }[]
                >`SELECT id FROM "User" WHERE id = ${data.uploaderId} FOR KEY SHARE`
                if (!owner.length)
                    throw new Error('Upload cancelled because the account was removed')
            }
            await tx.erasureObject.delete({ where: { id: reservation.id } })
            return tx.mediaFile.create({ data })
        })
    } catch (error) {
        await prisma.erasureObject.upsert({
            where: { id: reservation.id },
            create: { id: reservation.id, ...target },
            update: { retryAt: new Date() },
        })
        throw error
    }
}
