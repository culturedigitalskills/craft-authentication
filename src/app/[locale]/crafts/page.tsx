import { useTranslations } from 'next-intl'
import { Container } from '@/components/layout/Container'
import { CardTitle, CardContent, CardHeader, Card } from '@/components/ui/card'
import Link from 'next/dist/client/link'
import Image from 'next/image'
import { Calendar, User } from 'lucide-react'
import { formatDateTime } from '@/components/shared/formatDateTime'
import PaginationControls from '@/components/craft/PaginationControls'
import { prisma } from '@/lib/prisma'
import { SearchInput } from '@/components/shared/SearchInput'

const LIMIT = 21

export default async function CraftsPage(
    { searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }
) {
    const params = await searchParams
    const page = params.page ? Math.max(1, parseInt(params.page)) : 1
    const q = params.q?.trim() ?? ''
    const skip = (page - 1) * LIMIT

    const whereClause = {
        data: { path: ['isPublic'], equals: true },
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    }

    let craftsWithNames: any[] = []
    let pagination = { currentPage: page, totalPages: 1, totalCount: 0, hasNext: false, hasPrev: false }

    try {
        const [craftRecords, totalCount] = await Promise.all([
            prisma.dataRecord.findMany({
                where: whereClause,
                select: { id: true, name: true, data: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: LIMIT,
            }),
            prisma.dataRecord.count({ where: whereClause }),
        ])

        const crafts = craftRecords.map(record => {
            const d = record.data as Record<string, any>
            const mediaIds: string[] = (d['mediaIds'] as string[] ?? []).filter(Boolean)
            return {
                id: record.id,
                title: record.name,
                artisanEmail: d['artisan'] as string | null,
                createdOn: d['createdOn'] as string,
                material: (d['material'] as string | null) ?? null,
                imageUrl: mediaIds.length > 0 ? `/api/media/${mediaIds[0]}` : null,
            }
        })

        const emails = [...new Set(crafts.map(c => c.artisanEmail).filter(Boolean))] as string[]
        const artisanProfiles = emails.length > 0
            ? await prisma.artisan.findMany({
                where: { user: { email: { in: emails } } },
                select: { firstName: true, lastName: true, slug: true, user: { select: { email: true } } },
            })
            : []
        const artisanByEmail = new Map(artisanProfiles.map(a => [a.user.email, a]))

        craftsWithNames = crafts.map(c => {
            const a = c.artisanEmail ? artisanByEmail.get(c.artisanEmail) : null
            return {
                ...c,
                artisanName: a ? `${a.firstName} ${a.lastName}` : null,
                artisanSlug: a?.slug ?? null,
            }
        })

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
    console.log('Rendering CraftsPage with crafts:', crafts)
    return (
        <Container>
            <div className="mb-8 text-center">
                <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">{t('crafts.welcomeTitle')}</h1>
                <p className="mt-3 text-lg text-muted-foreground">{t('crafts.description')}</p>
            </div>

            <div className="mb-6 flex items-center justify-between gap-4">
                <SearchInput placeholder={t('crafts.explore.searchPlaceholder')} />
                {pagination.totalCount > 0 && (
                    <p className="shrink-0 text-sm text-muted-foreground">
                        {pagination.totalCount} {t('crafts.explore.craftsCount')}
                    </p>
                )}
            </div>

            {crafts.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {crafts.map((craft) => (
                        <Card key={craft.id} className="group transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
                                <Link href={`crafts/${craft.id}`} className="block">
                                <div className="relative aspect-square overflow-hidden rounded-t-lg">
                                    {craft.imageUrl ? (
                                        <Image
                                            src={craft.imageUrl}
                                            alt={craft.title}
                                            fill
                                            unoptimized
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            className="object-cover transition-transform duration-200 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center bg-muted">
                                            <p className="text-muted-foreground">{t('crafts.explore.noImageAvailable')}</p>
                                        </div>
                                    )}

                                    {/* Material reveal on hover */}
                                    {craft.material && (
                                        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-warm px-3 py-1.5 transition-transform duration-200 group-hover:translate-y-0">
                                            <p className="truncate text-xs font-medium text-warm-foreground">{craft.material}</p>
                                        </div>
                                    )}
                                </div>
                                </Link>

                                <CardHeader className="pb-2">
                                    <CardTitle className="line-clamp-1 transition-colors group-hover:text-warm">
                                    <Link href={`crafts/${craft.id}`} className="block">
    
                                        {craft.title}
                                    </Link>  
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    <div className="space-y-1.5">
                                        {craft.artisanName && (
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                <span className="text-muted-foreground">{t('crafts.explore.by')}</span>
                                                <Link href={`artisans/${craft.artisanSlug}`}>
                                                    <span className="font-medium">{craft.artisanName}</span>
                                                </Link>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <Calendar className="h-3 w-3 shrink-0" />
                                            <span>{formatDateTime(craft.createdOn)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="rounded-lg border border-dashed border-border p-12 text-center">
                    <User className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">
                        {q ? t('crafts.explore.noResults') : t('crafts.explore.noCraftsFound')}
                    </p>
                </div>
            )}

            <PaginationControls
                currentPage={currentPage}
                pagination={pagination}
                currentPageUrl={currentPageUrl}
            />
        </Container>
    )
}
