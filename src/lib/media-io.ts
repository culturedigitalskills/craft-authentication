import { randomUUID } from 'crypto'
import fs from 'fs'
import { pipeline } from 'stream/promises'
import type { Readable } from 'stream'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { storeNewMedia } from '@/lib/store-new-media'
import s3Client, { BUCKET_NAME } from '@/lib/object-store'

// Shared object-store <-> local-disk helpers used by the caption pipeline and
// the story-film renderer. Callers are responsible for ensuring the bucket
// exists (initGarage) before writing.

/**
 * Stream an object straight to a local file. Used for large source media
 * (story videos can be ~100 MB) that must not be buffered in memory.
 */
export async function downloadObjectToFile(objectKey: string, destPath: string): Promise<void> {
    const res = await s3Client.send(
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey }),
    )
    await pipeline(res.Body as Readable, fs.createWriteStream(destPath))
}

/**
 * Store an in-memory buffer as a new MediaFile (object + DB row) and return its
 * id and object key. The object key is `${uuid}.${extension}`, matching the
 * convention used elsewhere in the codebase.
 */
export async function createMediaFileFromBuffer(params: {
    buffer: Buffer
    mimeType: string
    extension: string
    originalName: string
    uploaderId?: string | null
}): Promise<{ id: string; objectKey: string }> {
    const id = randomUUID()
    const objectKey = `${id}.${params.extension}`
    await storeNewMedia({
        id, filename: objectKey, originalName: params.originalName, mimeType: params.mimeType,
        size: params.buffer.byteLength, bucket: BUCKET_NAME, objectKey, uploaderId: params.uploaderId ?? null,
    }, params.buffer)
    return { id, objectKey }
}
