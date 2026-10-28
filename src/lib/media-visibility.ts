import { prisma } from '@/lib/prisma'
import { CRAFT_ENTITY_TYPE } from '@/lib/craft'
import { ANSWER_MEDIA_FIELDS } from '@/lib/validations/craftStory'

/**
 * Whether a media file may be served to anybody, or only to its owner.
 *
 * Media used to be served to whoever held the id, with a year of public cache
 * behind it. That made "private" mean "unlisted": the photos on an unpublished
 * craft, the recordings in a story still being written, a gallery item marked
 * private, and everything belonging to an artisan who had been removed all
 * stayed fetchable. The pages said no and the assets they linked to said yes.
 *
 * A file is public when something public points at it. Nothing pointing at it
 * means private, which is the right answer for a file just uploaded and not yet
 * attached, and for the audio the caption pipeline extracts.
 */

export type MediaAccess = {
    isPublic: boolean
    // Null when ownership cannot be established (an orphan, or a Group file).
    ownerUserId: string | null
}

/** One attachment's verdict, separated from the queries so it can be tested. */
export function attachmentIsPublic(
    entityType: string,
    isPublic: boolean,
    entity:
        | { kind: 'artisan'; removed: boolean }
        | { kind: 'craft'; isPublic: boolean; removed: boolean; artisanRemoved: boolean }
        | { kind: 'story'; published: boolean; artisanRemoved: boolean }
        | { kind: 'group'; isActive: boolean }
        | { kind: 'missing' },
): boolean {
    if (entity.kind === 'missing') return false
    if (entityType === 'Artisan') {
        // Profile and cover photos ride the same attachment flag as the gallery.
        return isPublic && !(entity as { removed: boolean }).removed
    }
    if (entityType === CRAFT_ENTITY_TYPE && entity.kind === 'craft') {
        return entity.isPublic && !entity.removed && !entity.artisanRemoved
    }
    if (entityType === 'CraftStory' && entity.kind === 'story') {
        return entity.published && !entity.artisanRemoved
    }
    if (entityType === 'Group' && entity.kind === 'group') return entity.isActive
    return false
}

export async function resolveMediaAccess(
    mediaId: string,
    uploaderId: string | null,
): Promise<MediaAccess> {
    const attachments = await prisma.mediaAttachment.findMany({
        where: { mediaId },
        select: { entityType: true, entityId: true, isPublic: true },
    })

    let ownerUserId = uploaderId
    let isPublic = false

    for (const attachment of attachments) {
        const entity = await loadEntity(attachment.entityType, attachment.entityId)
        if (!ownerUserId) ownerUserId = entity.ownerUserId
        if (attachmentIsPublic(attachment.entityType, attachment.isPublic, entity.state)) {
            isPublic = true
            // Public is public; the owner only matters for the private branch,
            // and most requests are a public image on a public page.
            return { isPublic, ownerUserId }
        }
    }

    // The two things a MediaFile can be without any attachment at all. Both are
    // reached by column, so an attached file is almost never either, and the
    // lookups wait until the cheap path has already failed.

    // A rendered story film: the film row points at its output.
    const film = await prisma.storyFilm.findFirst({
        where: { outputMediaId: mediaId },
        select: {
            isPublic: true,
            status: true,
            story: {
                select: {
                    status: true,
                    artisan: { select: { userId: true, deletedAt: true } },
                },
            },
        },
    })
    if (film) {
        ownerUserId = ownerUserId ?? film.story.artisan.userId
        if (
            film.isPublic &&
            film.status === 'READY' &&
            film.story.status === 'PUBLISHED' &&
            !film.story.artisan.deletedAt
        ) {
            return { isPublic: true, ownerUserId }
        }
    }

    // A spoken answer: the story points at one per question. Miss this and
    // every recording on a published story stops playing.
    const answerStory = await prisma.craftStory.findFirst({
        where: { OR: ANSWER_MEDIA_FIELDS.map(field => ({ [field]: mediaId })) },
        select: {
            status: true,
            artisan: { select: { userId: true, deletedAt: true } },
        },
    })
    if (answerStory) {
        ownerUserId = ownerUserId ?? answerStory.artisan.userId
        if (answerStory.status === 'PUBLISHED' && !answerStory.artisan.deletedAt) {
            return { isPublic: true, ownerUserId }
        }
    }

    return { isPublic, ownerUserId }
}

type LoadedEntity = {
    ownerUserId: string | null
    state: Parameters<typeof attachmentIsPublic>[2]
}

async function loadEntity(entityType: string, entityId: string): Promise<LoadedEntity> {
    if (entityType === 'Artisan') {
        const artisan = await prisma.artisan.findUnique({
            where: { id: entityId },
            select: { userId: true, deletedAt: true },
        })
        if (!artisan) return { ownerUserId: null, state: { kind: 'missing' } }
        return {
            ownerUserId: artisan.userId,
            state: { kind: 'artisan', removed: Boolean(artisan.deletedAt) },
        }
    }
    if (entityType === CRAFT_ENTITY_TYPE) {
        const craft = await prisma.craft.findUnique({
            where: { id: entityId },
            select: {
                isPublic: true,
                deletedAt: true,
                artisan: { select: { userId: true, deletedAt: true } },
            },
        })
        if (!craft) return { ownerUserId: null, state: { kind: 'missing' } }
        return {
            ownerUserId: craft.artisan.userId,
            state: {
                kind: 'craft',
                isPublic: craft.isPublic,
                removed: Boolean(craft.deletedAt),
                artisanRemoved: Boolean(craft.artisan.deletedAt),
            },
        }
    }
    if (entityType === 'CraftStory') {
        const story = await prisma.craftStory.findUnique({
            where: { id: entityId },
            select: {
                status: true,
                artisan: { select: { userId: true, deletedAt: true } },
            },
        })
        if (!story) return { ownerUserId: null, state: { kind: 'missing' } }
        return {
            ownerUserId: story.artisan.userId,
            state: {
                kind: 'story',
                published: story.status === 'PUBLISHED',
                artisanRemoved: Boolean(story.artisan.deletedAt),
            },
        }
    }
    if (entityType === 'Group') {
        const group = await prisma.group.findUnique({
            where: { id: entityId },
            select: { isActive: true },
        })
        if (!group) return { ownerUserId: null, state: { kind: 'missing' } }
        // Groups have no single owner; only a site admin acts on their media.
        return { ownerUserId: null, state: { kind: 'group', isActive: group.isActive } }
    }
    return { ownerUserId: null, state: { kind: 'missing' } }
}
