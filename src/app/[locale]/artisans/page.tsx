import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { User, MapPin } from 'lucide-react'
import PaginationControls from '@/components/craft/PaginationControls'
import { getTranslations } from 'next-intl/server'
import { SearchInput } from '@/components/shared/SearchInput'
import { GalleryHeader } from '@/components/sc/SectionHeader'
import { ScMedia } from '@/components/sc/ScMedia'
import { PortraitFallback, IndigoDotsCover, tintFor } from '@/components/sc/fallbacks'

interface PageProps {
    searchParams: Promise<{ page?: string; q?: string }>
}

export default async function ArtisansPage({ searchParams }: PageProps) {
    const { page: pageParam, q: qParam } = await searchParams
    const page = Math.max(1, parseInt(pageParam ?? '1', 10))
    const q = qParam?.trim() ?? ''
    const limit = 12
    const skip = (page - 1) * limit

    const t = await getTranslations()
    const currentPageUrl = `${process.env.AUTH_URL}/artisans`

    const whereClause = {
        deletedAt: null,
        ...(q
            ? {
                  OR: [
                      { firstName: { contains: q, mode: 'insensitive' as const } },
                      { lastName: { contains: q, mode: 'insensitive' as const } },
                  ],
              }
            : {}),
    }

    const [artisans, totalCount] = await Promise.all([
        prisma.artisan.findMany({
            where: whereClause,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                slug: true,
                bio: true,
                country: true,
                region: true,
                yearsOfExperience: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.artisan.count({ where: whereClause }),
    ])

    const artisanIds = artisans.map((a) => a.id)
    const photoAttachments =
        artisanIds.length > 0
            ? await prisma.mediaAttachment.findMany({
                  where: {
                      entityType: 'Artisan',
                      entityId: { in: artisanIds },
                      attachmentType: 'HERO',
                      isPrimary: true,
                  },
                  select: { entityId: true, mediaId: true },
              })
            : []

    const photoMap = new Map(photoAttachments.map((a) => [a.entityId, a.mediaId]))

    // Public craft counts per artisan, for the card stat strip.
    const craftCounts =
        artisanIds.length > 0
            ? await prisma.craft.groupBy({
                  by: ['artisanId'],
                  where: { artisanId: { in: artisanIds }, isPublic: true, deletedAt: null },
                  _count: { _all: true },
              })
            : []
    const craftCountMap = new Map(craftCounts.map((c) => [c.artisanId, c._count._all]))

    const totalPages = Math.max(1, Math.ceil(totalCount / limit))
    const pagination = {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    }

    return (
        <div className="sc-container py-10">
            <GalleryHeader
                eyebrow={t('navbar.artisans')}
                title={t('artisans.title')}
                description={t('artisans.description')}
            />

            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <SearchInput placeholder={t('artisans.searchPlaceholder')} />
                {totalCount > 0 && (
                    <p className="sc-meta shrink-0">
                        {totalCount} {t('artisans.artisansCount')}
                    </p>
                )}
            </div>

            {artisans.length > 0 ? (
                <div className="grid gap-[var(--sc-grid-gap)] sm:grid-cols-2 lg:grid-cols-3">
                    {artisans.map((artisan) => {
                        const mediaId = photoMap.get(artisan.id)
                        const photoUrl = mediaId ? `/api/media/${mediaId}` : null
                        const fullName = `${artisan.firstName} ${artisan.lastName}`
                        const location =
                            artisan.region && artisan.country
                                ? `${artisan.region}, ${artisan.country}`
                                : (artisan.country ?? null)
                        const specialty = undefined // artisan.hashtags?.[0] //no hashtags field on artisans
                        const craftCount = craftCountMap.get(artisan.id) ?? 0
                        const hue = tintFor(artisan.slug)

                        return (
                            <Link
                                key={artisan.id}
                                href={`/artisans/${artisan.slug}`}
                                className="sc-card group block"
                            >
                                {/* Cover strip */}
                                <div className="relative h-24 overflow-hidden">
                                    <IndigoDotsCover
                                        style={{
                                            background: `linear-gradient(135deg, color-mix(in srgb, ${hue} 70%, var(--sc-ink)) 0%, var(--sc-ink) 100%)`,
                                        }}
                                    />
                                </div>

                                <div className="px-5 pb-5">
                                    {/* Overlapping portrait */}
                                    <div
                                        className="relative -mt-10 mb-3 h-20 w-20 overflow-hidden rounded-full"
                                        style={{
                                            border: '3px solid var(--sc-surface)',
                                            boxShadow: 'var(--sc-shadow-card)',
                                        }}
                                    >
                                        <ScMedia
                                            src={photoUrl}
                                            alt={fullName}
                                            fallback={<PortraitFallback name={fullName} />}
                                            sizes="80px"
                                            className="transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>

                                    <h2
                                        className="sc-h2 leading-tight transition-colors group-hover:text-[color:var(--sc-accent)]"
                                        style={{ fontSize: '20px' }}
                                    >
                                        {fullName}
                                    </h2>

                                    {specialty && (
                                        <span
                                            className="sc-badge mt-2"
                                            style={{ ['--t' as string]: hue }}
                                        >
                                            {specialty}
                                        </span>
                                    )}

                                    {location && (
                                        <p
                                            className="mt-2 flex items-center gap-1.5 text-sm"
                                            style={{ color: 'var(--sc-text-soft)' }}
                                        >
                                            <MapPin
                                                className="h-4 w-4 shrink-0"
                                                style={{ color: 'var(--sc-text-muted)' }}
                                            />
                                            {location}
                                        </p>
                                    )}

                                    {artisan.bio && (
                                        <p
                                            className="mt-2 line-clamp-2 sc-body"
                                            style={{ fontSize: '14px' }}
                                        >
                                            {artisan.bio}
                                        </p>
                                    )}

                                    {/* Stat strip */}
                                    <div
                                        className="mt-4 flex items-center gap-5 border-t pt-3"
                                        style={{ borderColor: 'var(--sc-border)' }}
                                    >
                                        <span className="flex flex-col">
                                            <span
                                                style={{
                                                    fontFamily: 'var(--sc-font-display)',
                                                    fontWeight: 600,
                                                    fontSize: '18px',
                                                    color: 'var(--sc-ink)',
                                                }}
                                            >
                                                {craftCount}
                                            </span>
                                            <span className="sc-meta">{t('artisans.crafts')}</span>
                                        </span>
                                        {artisan.yearsOfExperience !== null && (
                                            <span className="flex flex-col">
                                                <span
                                                    style={{
                                                        fontFamily: 'var(--sc-font-display)',
                                                        fontWeight: 600,
                                                        fontSize: '18px',
                                                        color: 'var(--sc-ink)',
                                                    }}
                                                >
                                                    {artisan.yearsOfExperience}
                                                </span>
                                                <span className="sc-meta">
                                                    {t('artisans.yearsExperience')}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            ) : (
                <div
                    className="rounded-[var(--sc-r-card)] border border-dashed p-12 text-center"
                    style={{ borderColor: 'var(--sc-border-strong)' }}
                >
                    <User
                        className="mx-auto mb-3 h-10 w-10"
                        style={{ color: 'var(--sc-text-muted)' }}
                    />
                    <p className="sc-body">
                        {q ? t('artisans.noResults') : t('artisans.noArtisansFound')}
                    </p>
                </div>
            )}

            <PaginationControls
                currentPage={page}
                pagination={pagination}
                currentPageUrl={currentPageUrl}
            />
        </div>
    )
}
