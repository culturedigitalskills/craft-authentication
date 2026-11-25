import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { prisma } from '@/lib/prisma'
import storage from '@/lib/object-store'

export const RECEIPT_SECONDS = 7 * 24 * 60 * 60

// A lease allows overlapping workers and recovers work interrupted by a restart.
// Object keys are immutable. Repeating a DELETE after a lost response is safe.
export async function drainErasureObjects(receiptId?: string) {
    const now = new Date()
    const entries = await prisma.erasureObject.findMany({
        where: { receiptId, retryAt: { lte: now } },
        orderBy: [{ retryAt: 'asc' }, { id: 'asc' }],
        take: 50,
    })
    for (const item of entries) {
        const claimed = await prisma.erasureObject.updateMany({
            where: { id: item.id, retryAt: { lte: now } },
            data: { retryAt: new Date(Date.now() + 60_000) },
        })
        if (!claimed.count) continue
        try {
            const exists = await prisma.mediaFile.findFirst({
                where: { bucket: item.bucket, objectKey: item.objectKey },
                select: { id: true },
            })
            if (!exists) {
                await storage.send(
                    new DeleteObjectCommand({ Bucket: item.bucket, Key: item.objectKey }),
                    {
                        abortSignal: AbortSignal.timeout(8_000),
                    },
                )
            }
            await prisma.erasureObject.deleteMany({ where: { id: item.id } })
        } catch {
            console.error('Stored file deletion pending retry')
        }
    }
    await prisma.erasureReceipt.updateMany({
        where: { id: receiptId, completedAt: null, objects: { none: {} } },
        data: { completedAt: new Date() },
    })
    if (!receiptId) {
        await prisma.erasureReceipt.deleteMany({
            where: { completedAt: { lt: new Date(Date.now() - RECEIPT_SECONDS * 1000) } },
        })
    }
}
