import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Users, MapPin, Globe, Award, BookOpen, DoorOpen, GraduationCap, User, ExternalLink, Pencil, ArrowLeft, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

    // Fetch group photos (cover + logo)
    const [coverAttachment, logoAttachment] = await Promise.all([
        prisma.mediaAttachment.findFirst({
            where: { entityType: 'Group', entityId: group.id, attachmentType: 'COVER', isPrimary: true },
            select: { mediaId: true },
        }),
        prisma.mediaAttachment.findFirst({
            where: { entityType: 'Group', entityId: group.id, attachmentType: 'HERO', isPrimary: true },
            select: { mediaId: true },
        }),
    ])
    const coverUrl = coverAttachment ? `/api/media/${coverAttachment.mediaId}` : null
    const logoUrl = logoAttachment ? `/api/media/${logoAttachment.mediaId}` : null

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
        <div>
            {/* ── Hero ── */}
            <section className="relative overflow-hidden border-b border-border/50 bg-muted/60 pb-14 pt-12">
                {coverUrl ? (
                    <Image
                        src={coverUrl}
                        alt={`${group.name} cover`}
                        fill
                        sizes="100vw"
                        className="object-cover"
                        priority
                    />
                ) : (
                    <>
                        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl" />
                        <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/[0.07] blur-3xl" />
                    </>
                )}
                {coverUrl && <div className="absolute inset-0" style={{ backgroundColor: 'oklch(0.08 0.01 250 / 0.4)' }} />}

                {/* Back link, overlaid top-left */}
                <Link
                    href="/groups"
                    aria-label="Back to communities"
                    className={`absolute left-4 top-4 z-10 inline-flex rounded-md p-2 transition-colors ${
                        coverUrl
                            ? 'text-white/90 hover:bg-white/10'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>

                <div className="relative mx-auto max-w-4xl px-4 text-center">
                    {/* Logo */}
                    <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-2xl border-4 border-background bg-card shadow-xl sm:h-28 sm:w-28">
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt={`${group.name} logo`}
                                width={112}
                                height={112}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted">
                                <Users className="h-10 w-10 text-muted-foreground" />
                            </div>
                        )}
                    </div>

                    <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${coverUrl ? 'text-white' : ''}`}>
                        {group.name}
                    </h1>

                    {group.location && (
                        <p className={`mt-1.5 inline-flex items-center gap-1.5 text-sm ${coverUrl ? 'text-white/80' : 'text-muted-foreground'}`}>
                            <MapPin className="h-4 w-4" />
                            {group.location}
                        </p>
                    )}

                    {(canManage || group.website) && (
                        <div className="mt-4 flex flex-wrap justify-center gap-3">
                            {canManage && (
                                <Button asChild>
                                    <Link href={`/groups/${group.slug}/manage`}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {t('editGroup')}
                                    </Link>
                                </Button>
                            )}
                            {group.website && (
                                <Button variant="outline" asChild>
                                    <a href={group.website} target="_blank" rel="noopener noreferrer">
                                        <Globe className="mr-2 h-4 w-4" />
                                        {t('website')}
                                        <ExternalLink className="ml-2 h-3 w-3" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Stats ── */}
            <section className="border-b border-border/50 bg-background py-8">
                <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 px-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-muted/60 p-5 text-center">
                        <Users className="mx-auto mb-2 h-6 w-6 text-warm" />
                        <p className="font-semibold">{group.memberships.length}</p>
                        <p className="text-xs text-muted-foreground">{t('members')}</p>
                    </div>
                    {group.location && (
                        <div className="rounded-lg bg-muted/60 p-5 text-center">
                            <MapPin className="mx-auto mb-2 h-6 w-6 text-warm" />
                            <p className="font-semibold">{group.location}</p>
                            <p className="text-xs text-muted-foreground">{t('location')}</p>
                        </div>
                    )}
                    {group.organizationType !== 'OTHER' && (
                        <div className="rounded-lg bg-muted/60 p-5 text-center">
                            <Building2 className="mx-auto mb-2 h-6 w-6 text-warm" />
                            <p className="font-semibold">{t(`orgType_${group.organizationType}`)}</p>
                            <p className="text-xs text-muted-foreground">{t('organizationType')}</p>
                        </div>
                    )}
                </div>

                {/* Tags */}
                <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2 px-4">
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
                    {group.certifications.map(cert => (
                        <span key={cert} className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
                            <Award className="h-3.5 w-3.5" />
                            {t(`cert_${cert}`)}
                        </span>
                    ))}
                </div>
            </section>

            {/* ── About ── */}
            {group.description && (
                <section className="bg-muted/40 py-10">
                    <div className="mx-auto max-w-3xl px-4">
                        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-warm">
                            {t('description')}
                        </h2>
                        <div className="border-l-2 border-warm/30 pl-5">
                            <p className="text-base leading-relaxed text-foreground/80">
                                {group.description}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* ── Members ── */}
            <section className="mx-auto max-w-4xl px-4 py-10">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-warm">{t('members')}</h2>

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
            </section>
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
