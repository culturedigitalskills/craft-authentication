import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { prisma } from '@/lib/prisma'
import s3Client from '@/lib/object-store'
import { generateCraftVC } from '@/lib/did/vc'
import { DOMAIN } from '@/lib/did/config'

export const CRAFT_ENTITY_TYPE = 'Craft'

/**
 * SHA-256 of a stored object's actual bytes, for the credential's imageHash
 * claim. Returns null when the row or the object cannot be read so a storage
 * blip costs us the claim rather than the whole credential. Reading the object
 * whole is fine here: only images are hashed and they are capped at 8MB.
 */
async function hashMediaFile(mediaId: string): Promise<string | null> {
    try {
        const file = await prisma.mediaFile.findUnique({
            where: { id: mediaId },
            select: { bucket: true, objectKey: true },
        })
        if (!file) return null

        const response = await s3Client.send(
            new GetObjectCommand({ Bucket: file.bucket, Key: file.objectKey }),
        )
        const bytes = await response.Body?.transformToByteArray()
        if (!bytes) return null

        return crypto.createHash('sha256').update(bytes).digest('hex')
    } catch (error) {
        console.error('Failed to hash media for credential', mediaId, error)
        return null
    }
}

export function craftCredentialId(craftId: string): string {
    return `${DOMAIN}/credentials/crafts/${craftId}`
}

/**
 * Issue (or re-issue) the Verifiable Credential for a craft and upsert it.
 * The credential holder/owner is the artisan SLUG — never an email — so public
 * VC responses don't leak PII. Keyed by the craft id so existing QR codes and
 * already-issued credential URLs keep resolving.
 */
export async function issueCraftVC(params: {
    id: string
    title: string
    description: string | null
    artisanSlug: string
    createdAt: Date
    firstMediaId: string | null
}): Promise<void> {
    const firstImageUrl = params.firstMediaId
        ? `${process.env.AUTH_URL}/api/media/${params.firstMediaId}`
        : null
    const imageHash = params.firstMediaId ? await hashMediaFile(params.firstMediaId) : null

    const vc = await generateCraftVC(
        params.id,
        params.title,
        params.description ?? '',
        params.artisanSlug,
        params.createdAt.toISOString(),
        firstImageUrl,
        imageHash,
    )

    const credentialId = craftCredentialId(params.id)
    await prisma.verifiableCredential.upsert({
        where: { credentialId },
        create: {
            credentialId,
            issuerDid: vc.issuer.id,
            holderDid: params.artisanSlug,
            credentialType: 'CraftCredential',
            credentialSubject: vc.credentialSubject as object,
            proof: vc.proof as object,
            issuanceDate: new Date(vc.validFrom),
        },
        update: {
            holderDid: params.artisanSlug,
            credentialSubject: vc.credentialSubject as object,
            proof: vc.proof as object,
            issuanceDate: new Date(vc.validFrom),
        },
    })
}

export async function deleteCraftVC(craftId: string): Promise<void> {
    await prisma.verifiableCredential
        .deleteMany({ where: { credentialId: craftCredentialId(craftId) } })
        .catch(() => {})
}

/**
 * Replace a craft's media attachments with the supplied ordered mediaIds.
 * First image becomes HERO + primary, the rest GALLERY. Returns the mediaIds
 * that were removed so the caller can garbage-collect the underlying files.
 *
 * Pass `db` to run inside a caller's transaction, so a craft is never written
 * without the attachments that were saved alongside it.
 */
export async function setCraftMedia(
    craftId: string,
    mediaIds: string[],
    db: Prisma.TransactionClient = prisma,
): Promise<string[]> {
    const existing = await db.mediaAttachment.findMany({
        where: { entityType: CRAFT_ENTITY_TYPE, entityId: craftId },
        select: { mediaId: true },
    })
    const existingIds = existing.map(a => a.mediaId)
    const nextIds = [...new Set(mediaIds.filter(Boolean))]

    await db.mediaAttachment.deleteMany({
        where: { entityType: CRAFT_ENTITY_TYPE, entityId: craftId },
    })

    if (nextIds.length > 0) {
        // The hero/primary must be an image — it's reused as the thumbnail in
        // list views (rendered as <img>), so a video must never be primary.
        const files = await db.mediaFile.findMany({
            where: { id: { in: nextIds } },
            select: { id: true, mimeType: true },
        })
        const mimeById = new Map(files.map(f => [f.id, f.mimeType]))
        const heroId = nextIds.find(id => mimeById.get(id)?.startsWith('image/')) ?? nextIds[0]

        await db.mediaAttachment.createMany({
            data: nextIds.map((mediaId, i) => ({
                mediaId,
                entityType: CRAFT_ENTITY_TYPE,
                entityId: craftId,
                attachmentType: mediaId === heroId ? ('HERO' as const) : ('GALLERY' as const),
                isPrimary: mediaId === heroId,
                displayOrder: i,
            })),
        })
    }

    return existingIds.filter(id => !nextIds.includes(id))
}

/** Ordered list of a craft's media ids (display order). */
export async function getCraftMediaIds(craftId: string): Promise<string[]> {
    const atts = await prisma.mediaAttachment.findMany({
        where: { entityType: CRAFT_ENTITY_TYPE, entityId: craftId },
        orderBy: { displayOrder: 'asc' },
        select: { mediaId: true },
    })
    return atts.map(a => a.mediaId)
}

/** Ordered list of a craft's media with mime type, for distinguishing image vs video. */
export async function getCraftMediaItems(craftId: string): Promise<{ mediaId: string; mimeType: string | null }[]> {
    const atts = await prisma.mediaAttachment.findMany({
        where: { entityType: CRAFT_ENTITY_TYPE, entityId: craftId },
        orderBy: { displayOrder: 'asc' },
        select: { mediaId: true, media: { select: { mimeType: true } } },
    })
    return atts.map(a => ({ mediaId: a.mediaId, mimeType: a.media.mimeType }))
}

/** Map of craftId -> primary image mediaId, for list-view thumbnails. */
export async function getCraftPrimaryImageMap(craftIds: string[]): Promise<Map<string, string>> {
    if (craftIds.length === 0) return new Map()
    const atts = await prisma.mediaAttachment.findMany({
        where: {
            entityType: CRAFT_ENTITY_TYPE,
            entityId: { in: craftIds },
            isPrimary: true,
            // Only images make valid thumbnails; a video-only craft falls back
            // to the list view's placeholder instead of a broken <img>.
            media: { mimeType: { startsWith: 'image/' } },
        },
        select: { entityId: true, mediaId: true },
    })
    return new Map(atts.map(a => [a.entityId, a.mediaId]))
}

/** Verify every supplied media id was uploaded by this user. Returns unauthorized ids. */
export async function findUnownedMedia(mediaIds: string[], userId: string): Promise<string[]> {
    const ids = [...new Set(mediaIds.filter(Boolean))]
    if (ids.length === 0) return []
    const files = await prisma.mediaFile.findMany({
        where: { id: { in: ids } },
        select: { id: true, uploaderId: true },
    })
    const owned = new Set(files.filter(f => f.uploaderId === userId).map(f => f.id))
    return ids.filter(id => !owned.has(id))
}
