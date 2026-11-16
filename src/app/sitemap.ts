import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { PUBLIC_CRAFT_WHERE } from '@/lib/craft'
import { editorialPaths, publicUrl } from '@/i8n/seo'
import { routing } from '@/i8n/routing'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [artisans, crafts, groups] = await Promise.all([
        prisma.artisan.findMany({
            where: { deletedAt: null },
            select: { slug: true, updatedAt: true },
        }),
        prisma.craft.findMany({ where: PUBLIC_CRAFT_WHERE, select: { id: true, updatedAt: true } }),
        prisma.group.findMany({
            where: { isActive: true },
            select: { slug: true, updatedAt: true },
        }),
    ])
    const entries: MetadataRoute.Sitemap = editorialPaths.flatMap((path) =>
        routing.locales.map((locale) => ({ url: publicUrl(path, locale) })),
    )
    // Legal text and user-authored content have one canonical URL until translated.
    entries.push(
        ...['/privacy', '/terms', '/artisans', '/crafts', '/groups'].map((path) => ({
            url: publicUrl(path),
        })),
    )
    entries.push(
        ...artisans.map((item) => ({
            url: publicUrl('/artisans/' + item.slug),
            lastModified: item.updatedAt,
        })),
        ...crafts.map((item) => ({
            url: publicUrl('/crafts/' + item.id),
            lastModified: item.updatedAt,
        })),
        ...groups.map((item) => ({
            url: publicUrl('/groups/' + item.slug),
            lastModified: item.updatedAt,
        })),
    )
    return entries
}
