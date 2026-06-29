import { prisma } from '@/lib/prisma'

/** Entities whose URLs are keyed by a human-readable slug with rename history. */
export type SluggedModel = 'artisan' | 'group'

/** Normalise free text into a URL-safe slug. */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

/**
 * Is `slug` already claimed by another row — either as its current slug or as a
 * historical one? Checking history too keeps slugs globally unique within the
 * entity type, so an old slug can never be ambiguous between two records.
 */
async function slugTaken(model: SluggedModel, slug: string, excludeId?: string): Promise<boolean> {
    const where = {
        OR: [{ slug }, { previousSlugs: { has: slug } }],
        ...(excludeId ? { id: { not: excludeId } } : {}),
    }
    const found = model === 'artisan'
        ? await prisma.artisan.findFirst({ where, select: { id: true } })
        : await prisma.group.findFirst({ where, select: { id: true } })
    return found !== null
}

/**
 * Produce a unique slug from `base`, suffixing `-1`, `-2`, … on collision.
 * Pass `excludeId` when regenerating for an existing row so it doesn't collide
 * with itself.
 */
export async function generateUniqueSlug(model: SluggedModel, base: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(base)
    let slug = baseSlug
    let counter = 1
    while (await slugTaken(model, slug, excludeId)) {
        slug = `${baseSlug}-${counter}`
        counter++
    }
    return slug
}

/**
 * Roll the rename history forward when a slug changes: retire `currentSlug` into
 * history and drop `newSlug` from it (in case the row is reclaiming an old name).
 * Returns the history unchanged when the slug didn't actually move.
 */
export function rollSlugHistory(currentSlug: string, newSlug: string, history: string[]): string[] {
    if (currentSlug === newSlug) return history
    return Array.from(new Set([...history.filter(s => s !== newSlug), currentSlug]))
}
