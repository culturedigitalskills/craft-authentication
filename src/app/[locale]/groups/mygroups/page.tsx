import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Users, MapPin, Globe, Award, BookOpen, DoorOpen, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'My Groups — Sustainable Crafting',
    description: 'Groups you belong to.',
}

export default async function MyGroupsPage() {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const t = await getTranslations('groups')
    const nt = await getTranslations('navbar')

    const artisan = await prisma.artisan.findFirst({
        where: { user: { email: session.user.email! } },
        select: { id: true },
    })

    const memberships = artisan
        ? await prisma.artisanGroupMembership.findMany({
              where: { artisanId: artisan.id, leftDate: null },
              include: {
                  group: {
                      include: {
                          _count: { select: { memberships: true } },
                      },
                  },
              },
              orderBy: { joinedDate: 'asc' },
          })
        : []

    const groups = memberships.map((m) => ({ ...m.group, memberRole: m.role }))

    // Fetch logos for all groups
    const groupIds = groups.map((g) => g.id)
    const logoAttachments =
        groupIds.length > 0
            ? await prisma.mediaAttachment.findMany({
                  where: {
                      entityType: 'Group',
                      entityId: { in: groupIds },
                      attachmentType: 'HERO',
                      isPrimary: true,
                  },
                  select: { entityId: true, mediaId: true },
              })
            : []
    const logoMap = new Map(logoAttachments.map((a) => [a.entityId, `/api/media/${a.mediaId}`]))

    return (
        <div className="container mx-auto max-w-6xl px-4 py-10">
            <div className="mb-12 text-center">
                <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">{nt('mygroups')}</h1>
                <p className="mt-3 text-lg text-muted-foreground">{t('subtitle')}</p>
            </div>

            {groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-12 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="mb-4 text-muted-foreground">{t('empty')}</p>
                    <Button asChild>
                        <Link href="/groups">{t('browseGroups')}</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                        <Link
                            key={group.id}
                            href={`/groups/${group.slug}`}
                            className="group rounded-lg border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
                        >
                            <div className="flex items-center gap-3">
                                {logoMap.get(group.id) ? (
                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                                        <Image
                                            src={logoMap.get(group.id)!}
                                            alt={group.name}
                                            fill
                                            sizes="40px"
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <Users className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h2 className="truncate text-lg font-semibold transition-colors group-hover:text-warm">
                                        {group.name}
                                    </h2>
                                    <span className="inline-block rounded-full bg-warm/10 px-2 py-0.5 text-xs font-medium text-warm">
                                        {group.memberRole === 'ADMIN' ? t('admin') : t('member')}
                                    </span>
                                </div>
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
                                    <span className="inline-flex items-center gap-1 rounded-full bg-warm/10 px-2.5 py-0.5 text-xs font-medium text-warm">
                                        {t(`orgType_${group.organizationType}`)}
                                    </span>
                                )}
                                {group.isHeritageCraft && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                        <BookOpen className="h-3 w-3" />
                                        {t('heritageCraft')}
                                    </span>
                                )}
                                {group.isOpenToMembers && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                        <DoorOpen className="h-3 w-3" />
                                        {t('openToMembers')}
                                    </span>
                                )}
                                {group.hasTrainingProgram && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                                        <GraduationCap className="h-3 w-3" />
                                        {t('trainingProgram')}
                                    </span>
                                )}
                                {group.certifications?.map((cert) => (
                                    <span
                                        key={cert}
                                        className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800"
                                    >
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
