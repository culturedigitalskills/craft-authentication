import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { Users, MapPin, Globe, Award, BookOpen, DoorOpen, GraduationCap, Plus } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Groups — Sustainable Crafting',
    description: 'Browse artisan groups, associations, and cooperatives.',
}

export default async function GroupsPage() {
    const t = await getTranslations('groups')
    const session = await auth()
    const isAdmin = session?.user?.role === 'ADMIN'

    const groups = await prisma.group.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { memberships: true } },
        },
    })

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

    return (
        <div className="container mx-auto max-w-6xl px-4 py-10">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                {isAdmin && (
                    <Link
                        href="/groups/create"
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        {t('createGroup')}
                    </Link>
                )}
            </div>

            {groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-12 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('empty')}</p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.map(group => (
                        <Link
                            key={group.id}
                            href={`/groups/${group.slug}`}
                            className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
                        >
                            <div className="flex items-center gap-3">
                                {logoMap.get(group.id) ? (
                                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                                        <Image
                                            src={logoMap.get(group.id)!}
                                            alt={group.name}
                                            fill
                                            sizes="40px"
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <Users className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                )}
                                <h2 className="text-lg font-semibold transition-colors group-hover:text-primary">
                                    {group.name}
                                </h2>
                            </div>

                            {group.description && (
                                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                    {group.description}
                                </p>
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                                        Website
                                    </span>
                                )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {group.organizationType && group.organizationType !== 'OTHER' && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                        {t(`orgType_${group.organizationType}`)}
                                    </span>
                                )}
                                {group.isHeritageCraft && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                                        <BookOpen className="h-3 w-3" />
                                        {t('heritageCraft')}
                                    </span>
                                )}
                                {group.isOpenToMembers && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                        <DoorOpen className="h-3 w-3" />
                                        {t('openToMembers')}
                                    </span>
                                )}
                                {group.hasTrainingProgram && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                                        <GraduationCap className="h-3 w-3" />
                                        {t('trainingProgram')}
                                    </span>
                                )}
                                {group.certifications?.map(cert => (
                                    <span key={cert} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                        <Award className="h-3 w-3" />
                                        {t(`cert_${cert}`)}
                                    </span>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
