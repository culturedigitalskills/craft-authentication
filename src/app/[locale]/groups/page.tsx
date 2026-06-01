import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader'
import Image from 'next/image'
import { Users, MapPin, Globe, Award, BookOpen, DoorOpen, GraduationCap } from 'lucide-react'
import type { Metadata } from 'next'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import PaginationControls from '@/components/craft/PaginationControls'
import { SearchInput } from '@/components/shared/SearchInput'

interface PageProps {
    searchParams: Promise<{ page?: string; q?: string }>
}

export const metadata: Metadata = {
    title: 'Groups — Sustainable Crafting',
    description: 'Browse artisan groups, associations, and cooperatives.',
}

export default async function GroupsPage({ searchParams }: PageProps) {
    const { page: pageParam, q: qParam } = await searchParams
    const page = Math.max(1, parseInt(pageParam ?? '1', 10))
    const q = qParam?.trim() ?? ''
    const limit = 12
    const skip = (page - 1) * limit


    const t = await getTranslations('groups')
    const currentPageUrl = `${process.env.AUTH_URL}/groups`

    const whereClause = {
        isActive: true,
        ...(q ? {
            OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { description: { contains: q, mode: 'insensitive' as const } },
                { location: { contains: q, mode: 'insensitive' as const } },
            ],
        } : {}),
    }

    const [groups, totalCount] = await Promise.all([
        prisma.group.findMany({
            where: whereClause,
            orderBy: { name: 'asc' },
            include: {
                _count: { select: { memberships: true } },
            },
            skip,
            take: limit,
        }),
        prisma.group.count({ where: whereClause }),
    ])

    // Fetch logos for all groups
    const groupIds = groups.map(g => g.id)
    const logoAttachments = await prisma.mediaAttachment.findMany({
        where: {
            entityType: 'Group',
            entityId: { in: groupIds },
            attachmentType: 'HERO',
            isPrimary: true,
        },
        select: { entityId: true, mediaId: true },
    })
    const logoMap = new Map(logoAttachments.map(a => [a.entityId, `/api/media/${a.mediaId}`]))
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
            <PageHeader title={t('title')} description={t('subtitle')} />

            <div className="mb-6 flex items-center justify-between gap-4">
                <SearchInput placeholder={t('searchPlaceholder')} />
                {totalCount > 0 && (
                    <p className="shrink-0 text-sm text-muted-foreground">
                        {totalCount} {t('groupsCount')}
                    </p>
                )}
            </div>

            {groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-12 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">{q ? t('noResults') : t('empty')}</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map(group => (
                        <Card key={group.id} className="group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
                            <Link href={`/groups/${group.slug}`} className="flex flex-col h-full">
                                {/* Hero Image */}
                                <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-muted flex-shrink-0">
                                    {logoMap.get(group.id) ? (
                                        <Image
                                            src={logoMap.get(group.id)!}
                                            alt={group.name}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            className="object-cover transition-transform duration-200 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                                            <Users className="h-12 w-12 text-muted-foreground/40" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <CardHeader className="pb-2 flex-shrink-0">
                                    <CardTitle className="line-clamp-1 transition-colors group-hover:text-warm">
                                        {group.name}
                                    </CardTitle>
                                    {group.location && (
                                        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                            <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                                            {group.location}
                                        </p>
                                    )}
                                    <CardDescription className="line-clamp-2">
                                        {group.description || 'No description available'}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="flex flex-col flex-1 pt-4 pb-4 space-y-3 overflow-hidden">
                                    {/* Info Row */}
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                                        <span className="inline-flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {group._count.memberships} {t('members')}
                                        </span>

                                        {group.website && (
                                            <span className="inline-flex items-center gap-1">
                                                <Globe className="h-3.5 w-3.5" />
                                                {t('website')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                                        {group.organizationType && group.organizationType !== 'OTHER' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                {t(`orgType_${group.organizationType}`)}
                                            </span>
                                        )}
                                        {group.isHeritageCraft && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                                <BookOpen className="h-3 w-3" />
                                                {t('heritageCraft')}
                                            </span>
                                        )}
                                        {group.isOpenToMembers && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                                <DoorOpen className="h-3 w-3" />
                                                {t('openToMembers')}
                                            </span>
                                        )}
                                        {group.hasTrainingProgram && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                                                <GraduationCap className="h-3 w-3" />
                                                {t('trainingProgram')}
                                            </span>
                                        )}
                                        {group.certifications?.map(cert => (
                                            <span key={cert} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                <Award className="h-3 w-3" />
                                                {t(`cert_${cert}`)}
                                            </span>
                                        ))}
                                    </div>
                                </CardContent>
                            </Link>
                        </Card>
                    ))}
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
