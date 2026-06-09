import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import {
    Users,
    MapPin,
    Globe,
    Award,
    BookOpen,
    DoorOpen,
    GraduationCap,
    User,
    ExternalLink,
    Settings,
    ArrowLeft,
} from 'lucide-react'
import type { Metadata } from 'next'

interface PageProps {
    params: Promise<{ slug: string }>
}

async function getGroup(slug: string) {
    return prisma.group.findUnique({
        where: { slug },
        include: {
            memberships: {
                where: { leftDate: null },
                include: {
                    artisan: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            slug: true,
                            bio: true,
                        },
                    },
                },
                orderBy: [{ role: 'asc' }, { joinedDate: 'asc' }],
            },
        },
    })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const group = await getGroup(slug)
    if (!group) return { title: 'Group Not Found' }

    const title = `${group.name} — Group`
    const description =
        group.description?.slice(0, 160) ?? `Discover the artisans of ${group.name}.`

    return {
        title,
        description,
        openGraph: { title, description, type: 'website' },
        twitter: { card: 'summary', title, description },
    }
}

export default async function GroupDetailPage({ params }: PageProps) {
    const { slug } = await params
    const t = await getTranslations('groups')
    const group = await getGroup(slug)

    if (!group || !group.isActive) notFound()

    // Check if current user can manage this group
    const session = await auth()
    let canManage = session?.user?.role === 'ADMIN'
    if (!canManage && session?.user) {
        const artisan = await prisma.artisan.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        })
        if (artisan) {
            canManage = group.memberships.some(
                (m) => m.artisanId === artisan.id && m.role === 'ADMIN',
            )
        }
    }

    const admins = group.memberships.filter((m) => m.role === 'ADMIN')
    const members = group.memberships.filter((m) => m.role === 'MEMBER')

    // Fetch group photos (cover + logo)
    const [coverAttachment, logoAttachment] = await Promise.all([
        prisma.mediaAttachment.findFirst({
            where: {
                entityType: 'Group',
                entityId: group.id,
                attachmentType: 'COVER',
                isPrimary: true,
            },
            select: { mediaId: true },
        }),
        prisma.mediaAttachment.findFirst({
            where: {
                entityType: 'Group',
                entityId: group.id,
                attachmentType: 'HERO',
                isPrimary: true,
            },
            select: { mediaId: true },
        }),
    ])
    const coverUrl = coverAttachment ? `/api/media/${coverAttachment.mediaId}` : null
    const logoUrl = logoAttachment ? `/api/media/${logoAttachment.mediaId}` : null

    // Fetch profile photos for all members
    const artisanIds = group.memberships.map((m) => m.artisan.id)
    const photoAttachments = await prisma.mediaAttachment.findMany({
        where: {
            entityType: 'Artisan',
            entityId: { in: artisanIds },
            attachmentType: 'HERO',
            isPrimary: true,
        },
        select: { entityId: true, mediaId: true },
    })
    const photoMap = new Map(photoAttachments.map((p) => [p.entityId, `/api/media/${p.mediaId}`]))

    return (
        <div className="container mx-auto max-w-6xl px-4 py-10">
            {/* Back link */}
            <Link
                href="/groups"
                className="mb-6 inline-flex rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
                <ArrowLeft className="h-5 w-5" />
            </Link>

            {/* Group header */}
            <div className="mb-8 overflow-hidden rounded-lg border border-border bg-card">
                {/* Cover photo */}
                <div className="relative h-48 bg-gradient-to-br from-muted to-muted/50 sm:h-56">
                    {coverUrl && (
                        <Image
                            src={coverUrl}
                            alt={`${group.name} cover`}
                            fill
                            sizes="(max-width: 1152px) 100vw, 1152px"
                            className="object-cover"
                            priority
                            unoptimized
                        />
                    )}
                </div>

                <div className="p-6 sm:p-8">
                    {/* Logo + title row */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {logoUrl && (
                                <div className="relative -mt-16 h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-4 border-card bg-card shadow-md sm:h-24 sm:w-24">
                                    <Image
                                        src={logoUrl}
                                        alt={`${group.name} logo`}
                                        fill
                                        sizes="96px"
                                        className="object-cover"
                                        unoptimized
                                    />
                                </div>
                            )}
                            <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
                        </div>
                        {canManage && (
                            <Link
                                href={`/groups/${group.slug}/manage`}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <Settings className="h-4 w-4" />
                                {t('editGroup')}
                            </Link>
                        )}
                    </div>

                    {group.description && (
                        <p className="mt-3 max-w-2xl text-muted-foreground">{group.description}</p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            {group.memberships.length} {t('members')}
                        </span>

                        {group.location && (
                            <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {group.location}
                            </span>
                        )}

                        {group.website && (
                            <a
                                href={group.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-warm transition-colors hover:text-warm/80"
                            >
                                <Globe className="h-4 w-4" />
                                {t('website')}
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {group.organizationType !== 'OTHER' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-warm/10 px-3 py-1 text-sm font-medium text-warm">
                                {t(`orgType_${group.organizationType}`)}
                            </span>
                        )}
                        {group.isHeritageCraft && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
                                <BookOpen className="h-3.5 w-3.5" />
                                {t('heritageCraft')}
                            </span>
                        )}
                        {group.isOpenToMembers && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                                <DoorOpen className="h-3.5 w-3.5" />
                                {t('openToMembers')}
                            </span>
                        )}
                        {group.hasTrainingProgram && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800">
                                <GraduationCap className="h-3.5 w-3.5" />
                                {t('trainingProgram')}
                            </span>
                        )}
                        {group.certifications.map((cert) => (
                            <span
                                key={cert}
                                className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800"
                            >
                                <Award className="h-3.5 w-3.5" />
                                {t(`cert_${cert}`)}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Members */}
            <div>
                <h2 className="mb-4 text-lg font-semibold">{t('members')}</h2>

                {group.memberships.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-12 text-center">
                        <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                        <p className="text-muted-foreground">{t('noMembers')}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Admins section */}
                        {admins.length > 0 && (
                            <div>
                                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                    {t('admin')}
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {admins.map((m) => (
                                        <MemberCard
                                            key={m.id}
                                            artisan={m.artisan}
                                            photoUrl={photoMap.get(m.artisan.id) || null}
                                            isAdmin
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Members section */}
                        {members.length > 0 && (
                            <div>
                                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                    {t('member')}
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {members.map((m) => (
                                        <MemberCard
                                            key={m.id}
                                            artisan={m.artisan}
                                            photoUrl={photoMap.get(m.artisan.id) || null}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function MemberCard({
    artisan,
    photoUrl,
    isAdmin,
}: {
    artisan: { id: string; firstName: string; lastName: string; slug: string; bio: string | null }
    photoUrl: string | null
    isAdmin?: boolean
}) {
    return (
        <Link
            href={`/artisans/${artisan.slug}`}
            className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
        >
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                {photoUrl ? (
                    <Image
                        src={photoUrl}
                        alt={`${artisan.firstName} ${artisan.lastName}`}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                )}
            </div>
            <div className="min-w-0">
                <p className="font-medium transition-colors group-hover:text-warm">
                    {artisan.firstName} {artisan.lastName}
                </p>
                {isAdmin && (
                    <span className="mt-0.5 inline-block rounded-full bg-warm/10 px-2 py-0.5 text-xs font-medium text-warm">
                        Admin
                    </span>
                )}
                {artisan.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{artisan.bio}</p>
                )}
            </div>
        </Link>
    )
}
