import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Calendar, User } from 'lucide-react'
import { formatDateTime } from '@/components/shared/formatDateTime'
import PaginationControls from '@/components/craft/PaginationControls'
import { prisma } from '@/lib/prisma'
import { getCraftPrimaryImageMap } from '@/lib/craft'
import { SearchInput } from '@/components/shared/SearchInput'
import { GalleryHeader } from '@/components/sc/SectionHeader'
import { ScMedia } from '@/components/sc/ScMedia'
import { IndigoDotsCover } from '@/components/sc/fallbacks'

// Every card shares one aspect ratio so the grid reads as an even, tidy set.
// Just change the one constant. Examples:

// '1 / 1' — square images
// '4 / 3' — landscape
// '3 / 4' — portrait, a bit shorter than the current 4/5
const CARD_RATIO = '1 / 1'

const LIMIT = 21

export default async function CraftsPage(
    { searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }
) {
    const params = await searchParams
    const page = params.page ? Math.max(1, parseInt(params.page)) : 1
    const q = params.q?.trim() ?? ''
    const skip = (page - 1) * LIMIT

    const whereClause = {
        isPublic: true,
        deletedAt: null,
        ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    }

    let craftsWithNames: any[] = []
    let pagination = { currentPage: page, totalPages: 1, totalCount: 0, hasNext: false, hasPrev: false }

    try {
        const [craftRecords, totalCount] = await Promise.all([
            prisma.craft.findMany({
                where: whereClause,
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    artisan: { select: { firstName: true, lastName: true, slug: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: LIMIT,
            }),
            prisma.craft.count({ where: whereClause }),
        ])

        const imageMap = await getCraftPrimaryImageMap(craftRecords.map(c => c.id))

        craftsWithNames = craftRecords.map(record => ({
            id: record.id,
            title: record.title,
            createdOn: record.createdAt,
            imageUrl: imageMap.has(record.id) ? `/api/media/${imageMap.get(record.id)}` : null,
            artisanName: `${record.artisan.firstName} ${record.artisan.lastName}`,
            artisanSlug: record.artisan.slug,
        }))

        const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT))
        pagination = { currentPage: page, totalPages, totalCount, hasNext: page < totalPages, hasPrev: page > 1 }
    } catch (error) {
        console.error('Error loading crafts:', error)
    }

    const currentPageUrl = `${process.env.AUTH_URL}/crafts`
    return <RenderCraftsPage crafts={craftsWithNames} pagination={pagination} currentPage={page} currentPageUrl={currentPageUrl} q={q} />
}

function RenderCraftsPage({ crafts, pagination, currentPage, currentPageUrl, q }: {
    crafts: any[]
    pagination: any
    currentPage: number
    currentPageUrl: string
    q: string
}) {
    const t = useTranslations()
    return (
        <div className="sc-container py-10">
            <GalleryHeader
                eyebrow={t('navbar.crafts')}
                title={t('crafts.welcomeTitle')}
                description={t('crafts.description')}
            />

            {/* Filter bar */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <SearchInput placeholder={t('crafts.explore.searchPlaceholder')} />
                {pagination.totalCount > 0 && (
                    <p className="sc-meta shrink-0">
                        {pagination.totalCount} {t('crafts.explore.craftsCount')}
                    </p>
                )}
            </div>

            {crafts.length > 0 ? (
                <div className="grid grid-cols-1 gap-[var(--sc-grid-gap)] sm:grid-cols-2 lg:grid-cols-3">
                    {crafts.map((craft) => (
                        <div
                            key={craft.id}
                            className="sc-card sc-card--hover group flex flex-col"
                        >
                            <Link href={`crafts/${craft.id}`} className="block">
                                <div
                                    className="relative w-full overflow-hidden"
                                    style={{ aspectRatio: CARD_RATIO }}
                                >
                                    <ScMedia
                                        src={craft.imageUrl}
                                        alt={craft.title}
                                        fallback={<IndigoDotsCover />}
                                        className="transition-transform duration-300 group-hover:scale-[1.04]"
                                    />
                                </div>
                            </Link>

                            <div className="p-5">
                                <Link href={`crafts/${craft.id}`} className="block">
                                    <h2 className="sc-h2 line-clamp-2 transition-colors group-hover:text-[color:var(--sc-accent)]" style={{ fontSize: '21px' }}>
                                        {craft.title}
                                    </h2>
                                </Link>

                                {craft.artisanName && (
                                    <p className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: 'var(--sc-text-soft)' }}>
                                        <User className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--sc-text-muted)' }} />
                                        <span style={{ color: 'var(--sc-text-muted)' }}>{t('crafts.explore.by')}</span>
                                        <Link
                                            href={`artisans/${craft.artisanSlug}`}
                                            className="font-medium hover:text-[color:var(--sc-accent)]"
                                            style={{ color: 'var(--sc-text)' }}
                                        >
                                            {craft.artisanName}
                                        </Link>
                                    </p>
                                )}
                                <p className="mt-1.5 flex items-center gap-1.5 text-sm" style={{ color: 'var(--sc-text-muted)' }}>
                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                    <span>{formatDateTime(craft.createdOn)}</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    className="rounded-[var(--sc-r-card)] border border-dashed p-12 text-center"
                    style={{ borderColor: 'var(--sc-border-strong)' }}
                >
                    <User className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--sc-text-muted)' }} />
                    <p className="sc-body">
                        {q ? t('crafts.explore.noResults') : t('crafts.explore.noCraftsFound')}
                    </p>
                </div>
            )}

            <PaginationControls
                currentPage={currentPage}
                pagination={pagination}
                currentPageUrl={currentPageUrl}
            />
        </div>
    )
}
