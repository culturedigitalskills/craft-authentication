import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Container } from '@/components/layout/Container'
import Image from 'next/image'
import { Users, MapPin, Globe, Award, BookOpen, DoorOpen, GraduationCap } from 'lucide-react'
import type { Metadata } from 'next'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import PaginationControls from '@/components/craft/PaginationControls'

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

    const [groups, totalCount] = await Promise.all([
        // const groups = await
        prisma.group.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            include: {
                _count: { select: { memberships: true } },
            },
        }),
        prisma.group.count({
            where: {
                isActive: true,
            },
        }),
    ])

    // Fetch logos for all groups
    const groupIds = groups.map((g) => g.id)
    const logoAttachments = await prisma.mediaAttachment.findMany({
        where: {
            entityType: 'Group',
            entityId: { in: groupIds },
            attachmentType: 'HERO',
            isPrimary: true,
        },
        select: { entityId: true, mediaId: true },
    })
    const logoMap = new Map(logoAttachments.map((a) => [a.entityId, `/api/media/${a.mediaId}`]))
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
            <div className="mx-auto mb-12 max-w-3xl text-center">
                <h1 className="mb-8 text-4xl font-bold">{t('title')}</h1>
                <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
            </div>

            {groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-12 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('empty')}</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                        <Card
                            key={group.id}
                            className="group flex flex-col transition-shadow duration-200 hover:shadow-lg"
                        >
                            <Link href={`/groups/${group.slug}`} className="flex flex-col h-full">
                                {/* Hero Image */}
                                <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-muted shrink-0">
                                    {logoMap.get(group.id) ? (
                                        <Image
                                            src={logoMap.get(group.id)!}
                                            alt={group.name}
                                            fill
                                            unoptimized
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
                                <CardHeader className="pb-2 bg-muted shrink-0">
                                    <CardTitle className="line-clamp-1 transition-colors group-hover:text-primary">
                                        {group.name}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {group.description || 'No description available'}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="flex flex-col flex-1 pt-4 pb-4 bg-muted space-y-3 overflow-hidden">
                                    {/* Info Row */}
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground shrink-0">
                                        <span className="inline-flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {group._count.memberships} {t('members')}
                                        </span>

                                        {group.location && (
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {group.location}
                                            </span>
                                        )}

                                        {group.website && (
                                            <span className="inline-flex items-center gap-1">
                                                <Globe className="h-3.5 w-3.5" />
                                                {t('website')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1.5 shrink-0">
                                        {group.organizationType &&
                                            group.organizationType !== 'OTHER' && (
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
                                        {group.certifications?.map((cert) => (
                                            <span
                                                key={cert}
                                                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                                            >
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
