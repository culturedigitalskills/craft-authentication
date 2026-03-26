import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Users, MapPin, Globe, Award, Heart, Handshake, User, ExternalLink, Settings } from 'lucide-react'
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
                orderBy: [
                    { role: 'asc' },
                    { joinedDate: 'asc' },
                ],
            },
        },
    })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const group = await getGroup(slug)
    if (!group) return { title: 'Group Not Found' }

    const title = `${group.name} — Group`
    const description = group.description?.slice(0, 160) ?? `Discover the artisans of ${group.name}.`

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
                m => m.artisanId === artisan.id && m.role === 'ADMIN'
            )
        }
    }

    const admins = group.memberships.filter(m => m.role === 'ADMIN')
    const members = group.memberships.filter(m => m.role === 'MEMBER')

    // Fetch profile photos for all members
    const artisanIds = group.memberships.map(m => m.artisan.id)
    const photoAttachments = await prisma.mediaAttachment.findMany({
        where: {
            entityType: 'Artisan',
            entityId: { in: artisanIds },
            attachmentType: 'HERO',
            isPrimary: true,
        },
        select: { entityId: true, mediaId: true },
    })
    const photoMap = new Map(photoAttachments.map(p => [p.entityId, `/api/media/${p.mediaId}`]))

    return (
        <div className="container mx-auto max-w-6xl px-4 py-10">
            {/* Back link */}
            <Link
                href="/groups"
                className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                ← {t('title')}
            </Link>

            {/* Group header */}
            <div className="mb-8 rounded-lg border border-border bg-card p-6 sm:p-8">
                <div className="flex items-start justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
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
                            className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
                        >
                            <Globe className="h-4 w-4" />
                            {t('website')}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>

                {(group.isWomenLed || group.isCooperative || group.isFairTrade) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {group.isWomenLed && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1 text-sm font-medium text-pink-700">
                                <Heart className="h-3.5 w-3.5" />
                                {t('womenLed')}
                            </span>
                        )}
                        {group.isCooperative && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                                <Handshake className="h-3.5 w-3.5" />
                                {t('cooperative')}
                            </span>
                        )}
                        {group.isFairTrade && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                                <Award className="h-3.5 w-3.5" />
                                {t('fairTrade')}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Members */}
            <div>
                <h2 className="mb-5 text-xl font-semibold">{t('members')}</h2>

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
                                    {admins.map(m => (
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
                                    {members.map(m => (
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
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                )}
            </div>
            <div className="min-w-0">
                <p className="font-medium transition-colors group-hover:text-primary">
                    {artisan.firstName} {artisan.lastName}
                </p>
                {isAdmin && (
                    <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
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
