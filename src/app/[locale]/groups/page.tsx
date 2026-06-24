import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Users, MapPin, Globe, Award, BookOpen, DoorOpen, GraduationCap } from 'lucide-react'
import type { Metadata } from 'next'
import PaginationControls from '@/components/craft/PaginationControls'
import { SearchInput } from '@/components/shared/SearchInput'
import { GalleryHeader } from '@/components/sc/SectionHeader'
import { ScMedia } from '@/components/sc/ScMedia'
import { KraftMonogram, initialsFor, tintFor } from '@/components/sc/fallbacks'

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

    // A handful of member names per group for the overlapping avatar stack.
    const memberships = groupIds.length > 0
        ? await prisma.artisanGroupMembership.findMany({
            where: { groupId: { in: groupIds }, leftDate: null },
            select: { groupId: true, artisan: { select: { firstName: true, lastName: true } } },
            orderBy: { joinedDate: 'asc' },
        })
        : []
    const membersByGroup = new Map<string, string[]>()
    for (const m of memberships) {
        const list = membersByGroup.get(m.groupId) ?? []
        list.push(`${m.artisan.firstName} ${m.artisan.lastName}`)
        membersByGroup.set(m.groupId, list)
    }

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
                eyebrow={t('title')}
                title={t('title')}
                description={t('subtitle')}
            />

            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <SearchInput placeholder={t('searchPlaceholder')} />
                {totalCount > 0 && (
                    <p className="sc-meta shrink-0">
                        {totalCount} {t('groupsCount')}
                    </p>
                )}
            </div>

            {groups.length === 0 ? (
                <div className="rounded-[var(--sc-r-card)] border border-dashed p-12 text-center" style={{ borderColor: 'var(--sc-border-strong)' }}>
                    <Users className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--sc-text-muted)' }} />
                    <p className="sc-body">{q ? t('noResults') : t('empty')}</p>
                </div>
            ) : (
                <div className="grid gap-[var(--sc-grid-gap)] lg:grid-cols-2">
                    {groups.map(group => {
                        const logoUrl = logoMap.get(group.id)
                        const members = membersByGroup.get(group.id) ?? []
                        const hue = tintFor(group.slug)
                        const founded = new Date(group.createdAt).getFullYear()
                        return (
                            <Link
                                key={group.id}
                                href={`/groups/${group.slug}`}
                                className="sc-card group flex flex-col gap-5 p-5 sm:flex-row"
                            >
                                {/* Logo tile */}
                                <div
                                    className="relative h-32 w-full shrink-0 overflow-hidden rounded-[var(--sc-r-tile)] sm:h-32 sm:w-32"
                                >
                                    <ScMedia
                                        src={logoUrl}
                                        alt={group.name}
                                        fallback={<KraftMonogram name={group.name} />}
                                        sizes="128px"
                                        className="transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>

                                {/* Body */}
                                <div className="min-w-0 flex-1">
                                    <h2 className="sc-h2 line-clamp-1 transition-colors group-hover:text-[color:var(--sc-accent)]" style={{ fontSize: '22px' }}>
                                        {group.name}
                                    </h2>
                                    {group.location && (
                                        <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: 'var(--sc-text-soft)' }}>
                                            <MapPin className="h-4 w-4 shrink-0" style={{ color: 'var(--sc-text-muted)' }} />
                                            {group.location}
                                        </p>
                                    )}

                                    {/* Member stack */}
                                    {members.length > 0 && (
                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="sc-stack">
                                                {members.slice(0, 5).map((name, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="sc-avatar h-8 w-8 text-[11px]"
                                                        style={{ background: tintFor(name), borderColor: 'var(--sc-surface)' }}
                                                        title={name}
                                                    >
                                                        {initialsFor(name)}
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="sc-meta">
                                                {group._count.memberships} {t('members')}
                                            </span>
                                        </div>
                                    )}

                                    {/* 3-stat row */}
                                    <div className="mt-4 flex items-center gap-6 border-y py-3" style={{ borderColor: 'var(--sc-border)' }}>
                                        <Stat value={group._count.memberships} label={t('members')} />
                                        <Stat value={founded} label="est." />
                                        <Stat value={group.certifications?.length ?? 0} label={t('certifications')} />
                                    </div>

                                    {/* Badges */}
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {group.organizationType && group.organizationType !== 'OTHER' && (
                                            <span className="sc-badge" style={{ ['--t' as string]: hue }}>
                                                {t(`orgType_${group.organizationType}`)}
                                            </span>
                                        )}
                                        {group.isHeritageCraft && (
                                            <span className="sc-badge" style={{ ['--t' as string]: 'var(--sc-ochre)' }}>
                                                <BookOpen className="h-3 w-3" />
                                                {t('heritageCraft')}
                                            </span>
                                        )}
                                        {group.isOpenToMembers && (
                                            <span className="sc-badge" style={{ ['--t' as string]: 'var(--sc-olive)' }}>
                                                <DoorOpen className="h-3 w-3" />
                                                {t('openToMembers')}
                                            </span>
                                        )}
                                        {group.hasTrainingProgram && (
                                            <span className="sc-badge" style={{ ['--t' as string]: 'var(--sc-plum)' }}>
                                                <GraduationCap className="h-3 w-3" />
                                                {t('trainingProgram')}
                                            </span>
                                        )}
                                        {group.website && (
                                            <span className="sc-badge" style={{ ['--t' as string]: 'var(--sc-teal)' }}>
                                                <Globe className="h-3 w-3" />
                                                {t('website')}
                                            </span>
                                        )}
                                        {group.certifications?.map(cert => (
                                            <span key={cert} className="sc-badge" style={{ ['--t' as string]: 'var(--sc-teal-deep)' }}>
                                                <Award className="h-3 w-3" />
                                                {t(`cert_${cert}`)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
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

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
    return (
        <span className="flex flex-col">
            <span style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '18px', color: 'var(--sc-ink)' }}>{value}</span>
            <span className="sc-meta">{label}</span>
        </span>
    )
}
