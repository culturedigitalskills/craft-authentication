import { prisma } from '@/lib/prisma'
import { CRAFT_ENTITY_TYPE } from '@/lib/craft'

/**
 * Resolve the owning user of an attachment's entity. Returns null when
 * ownership cannot be established (e.g. Group attachments, unknown types) —
 * those are only actionable by site admins.
 *
 * Shared by the media delete route and the attachment detach route so the two
 * never disagree about who owns a file.
 */
export async function resolveEntityOwner(
    entityType: string,
    entityId: string,
): Promise<string | null> {
    if (entityType === 'Artisan') {
        const artisan = await prisma.artisan.findUnique({
            where: { id: entityId },
            select: { userId: true },
        })
        return artisan?.userId ?? null
    }
    if (entityType === CRAFT_ENTITY_TYPE) {
        const craft = await prisma.craft.findUnique({
            where: { id: entityId },
            select: { artisan: { select: { userId: true } } },
        })
        return craft?.artisan.userId ?? null
    }
    if (entityType === 'CraftStory') {
        const story = await prisma.craftStory.findUnique({
            where: { id: entityId },
            select: { artisan: { select: { userId: true } } },
        })
        return story?.artisan.userId ?? null
    }
    return null
}
