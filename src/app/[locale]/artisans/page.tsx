import { prisma } from '@/lib/prisma'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import Image from 'next/image'
import Link from 'next/link'
import { User, MapPin, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import PaginationControls from '@/components/craft/PaginationControls'
import { getTranslations } from 'next-intl/server'
import { SearchInput } from '@/components/shared/SearchInput'

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
        ...(q ? {
            OR: [
                { firstName: { contains: q, mode: 'insensitive' as const } },
                { lastName: { contains: q, mode: 'insensitive' as const } },
            ],
        } : {}),
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

    const artisanIds = artisans.map(a => a.id)
    const photoAttachments = artisanIds.length > 0
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

    const photoMap = new Map(photoAttachments.map(a => [a.entityId, a.mediaId]))

    const totalPages = Math.max(1, Math.ceil(totalCount / limit))
    const pagination = {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    }

    return (
        <Container>
            <PageHeader title={t('artisans.title')} description={t('artisans.description')} />

            <div className="mb-6 flex items-center justify-between gap-4">
                <SearchInput placeholder={t('artisans.searchPlaceholder')} />
                {totalCount > 0 && (
                    <p className="shrink-0 text-sm text-muted-foreground">
                        {totalCount} {t('artisans.artisansCount')}
                    </p>
                )}
            </div>

            {artisans.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {artisans.map(artisan => {
                        const mediaId = photoMap.get(artisan.id)
                        const photoUrl = mediaId ? `/api/media/${mediaId}` : null
                        const location = artisan.region && artisan.country
                            ? `${artisan.region}, ${artisan.country}`
                            : artisan.country ?? null

                        return (
                            <Card key={artisan.id} className="group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
                                    <div className="relative aspect-square overflow-hidden bg-muted">
                                    <Link href={`/artisans/${artisan.slug}`} className="block">
                                        {photoUrl ? (
                                            <Image
                                                src={photoUrl}
                                                alt={`${artisan.firstName} ${artisan.lastName}`}
                                                fill
                                                unoptimized
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className="object-cover transition-transform duration-200 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <User className="h-16 w-16 text-muted-foreground/40" />
                                            </div>
                                        )}
                                    </Link>
                                    </div>
                                    <CardContent className="p-4">
                                        <Link href={`/artisans/${artisan.slug}`} className="block">

                                        <h2 className="text-lg font-semibold leading-tight transition-colors group-hover:text-warm">
                                            {artisan.firstName} {artisan.lastName}
                                        </h2>
                                        </Link>
                                        {location && (
                                            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                                                {location}
                                            </p>
                                        )}

                                        {artisan.yearsOfExperience !== null && (
                                            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                                <Clock className="h-3 w-3 shrink-0" />
                                                {artisan.yearsOfExperience} {t('artisans.yearsExperience')}
                                            </p>
                                        )}

                                        {artisan.bio && (
                                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                                {artisan.bio}
                                            </p>
                                        )}
                                    </CardContent>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="rounded-lg border border-dashed border-border p-12 text-center">
                    <User className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">
                        {q ? t('artisans.noResults') : t('artisans.noArtisansFound')}
                    </p>
                </div>
            )}

            <PaginationControls
                currentPage={page}
                pagination={pagination}
                currentPageUrl={currentPageUrl}
            />
        </Container>
    )
}
