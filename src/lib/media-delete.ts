import { prisma } from '@/lib/prisma'
import s3Client, { BUCKET_NAME } from '@/lib/object-store'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

/**
 * Delete a MediaFile row and its underlying Garage object in a transaction.
 * Best-effort for the S3 side — logs on failure so we don't strand the DB row.
 *
 * Reference-aware: a file is only deleted once nothing else points at it. This
 * matters because the same file can be shared — e.g. an image picked from the
 * artisan's media gallery and also attached to a craft. Callers GC by removing
 * their own attachments first, then asking us to clean up; if any attachment
 * remains (another craft, the gallery), the file is kept. A rendered story-film
 * output has no MediaAttachment but is referenced by StoryFilm.outputMediaId, so
 * it is guarded separately.
 */
export async function deleteMediaFile(id: string) {
    const file = await prisma.mediaFile.findUnique({ where: { id } })
    if (!file) return
    const remainingRefs = await prisma.mediaAttachment.count({ where: { mediaId: id } })
    if (remainingRefs > 0) return
    const filmRefs = await prisma.storyFilm.count({ where: { outputMediaId: id } })
    if (filmRefs > 0) return

    // Captioning stores the audio it extracted as its own MediaFile, linked from
    // the transcript rather than by an attachment. The transcript cascades away
    // with this row, so unless the audio is captured first nothing will ever
    // point at it again and it is stranded in storage.
    const transcript = await prisma.mediaTranscript.findUnique({
        where: { mediaId: id },
        select: { audioMediaId: true },
    })

    await prisma.$transaction(async tx => {
        await tx.mediaFile.delete({ where: { id } })
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: file.objectKey }))
    })

    // After the source is gone, so the audio is genuinely unreferenced. The
    // extracted file is never itself a transcript source, so this cannot recur.
    if (transcript?.audioMediaId) {
        await deleteMediaFile(transcript.audioMediaId)
    }
}

export async function deleteMediaFiles(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))]
    await Promise.allSettled(unique.map(id => deleteMediaFile(id)))
}
