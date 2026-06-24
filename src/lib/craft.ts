import { prisma } from '@/lib/prisma'
import { generateCraftVC } from '@/lib/did/vc'
import { DOMAIN } from '@/lib/did/config'

export const CRAFT_ENTITY_TYPE = 'Craft'

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

    const vc = await generateCraftVC(
        params.id,
        params.title,
        params.description ?? '',
        params.artisanSlug,
        params.createdAt.toISOString(),
        firstImageUrl,
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
 */
export async function setCraftMedia(craftId: string, mediaIds: string[]): Promise<string[]> {
    const existing = await prisma.mediaAttachment.findMany({
        where: { entityType: CRAFT_ENTITY_TYPE, entityId: craftId },
        select: { mediaId: true },
    })
    const existingIds = existing.map(a => a.mediaId)
    const nextIds = [...new Set(mediaIds.filter(Boolean))]

    await prisma.mediaAttachment.deleteMany({
        where: { entityType: CRAFT_ENTITY_TYPE, entityId: craftId },
    })

    if (nextIds.length > 0) {
        await prisma.mediaAttachment.createMany({
            data: nextIds.map((mediaId, i) => ({
                mediaId,
                entityType: CRAFT_ENTITY_TYPE,
                entityId: craftId,
                attachmentType: i === 0 ? ('HERO' as const) : ('GALLERY' as const),
                isPrimary: i === 0,
                displayOrder: i,
            })),
        })
    }

    return existingIds.filter(id => !nextIds.includes(id))
}

/** Ordered list of a craft's media ids (HERO first). */
export async function getCraftMediaIds(craftId: string): Promise<string[]> {
    const atts = await prisma.mediaAttachment.findMany({
        where: { entityType: CRAFT_ENTITY_TYPE, entityId: craftId },
        orderBy: { displayOrder: 'asc' },
        select: { mediaId: true },
    })
    return atts.map(a => a.mediaId)
}

/** Map of craftId -> primary mediaId, for list views. */
export async function getCraftPrimaryImageMap(craftIds: string[]): Promise<Map<string, string>> {
    if (craftIds.length === 0) return new Map()
    const atts = await prisma.mediaAttachment.findMany({
        where: {
            entityType: CRAFT_ENTITY_TYPE,
            entityId: { in: craftIds },
            isPrimary: true,
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
