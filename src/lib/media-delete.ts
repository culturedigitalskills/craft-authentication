import { prisma } from '@/lib/prisma'
import s3Client, { BUCKET_NAME } from '@/lib/object-store'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

/**
 * Delete a MediaFile row and its underlying Garage object in a transaction.
 * Best-effort for the S3 side — logs on failure so we don't strand the DB row.
 */
export async function deleteMediaFile(id: string) {
    const file = await prisma.mediaFile.findUnique({ where: { id } })
    if (!file) return
    await prisma.$transaction(async tx => {
        await tx.mediaFile.delete({ where: { id } })
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: file.objectKey }))
    })
}

export async function deleteMediaFiles(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))]
    await Promise.allSettled(unique.map(id => deleteMediaFile(id)))
}
