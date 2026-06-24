import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Users, MapPin, Globe, Award, BookOpen, DoorOpen, GraduationCap, ExternalLink, Pencil, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { ScMedia } from '@/components/sc/ScMedia'
import { KraftMonogram, PortraitFallback, IndigoDotsCover, initialsFor, tintFor } from '@/components/sc/fallbacks'
import { SectionHeader } from '@/components/sc/SectionHeader'
import { getCraftPrimaryImageMap } from '@/lib/craft'

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
    const tNav = await getTranslations('navbar')
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

    // Collective crafts wall — recent public crafts from the group's members.
    const collectiveCraftRecords = artisanIds.length > 0
        ? await prisma.craft.findMany({
            where: { artisanId: { in: artisanIds }, isPublic: true, deletedAt: null },
            select: { id: true, title: true, artisan: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' },
            take: 8,
        })
        : []
    const collectiveImageMap = await getCraftPrimaryImageMap(collectiveCraftRecords.map(c => c.id))
    const collectiveCrafts = collectiveCraftRecords.map(c => ({
        id: c.id,
        title: c.title,
        maker: `${c.artisan.firstName} ${c.artisan.lastName}`,
        imageUrl: collectiveImageMap.has(c.id) ? `/api/media/${collectiveImageMap.get(c.id)}` : null,
    }))

    const founded = new Date(group.createdAt).getFullYear()

    const memberNames = group.memberships.map(m => `${m.artisan.firstName} ${m.artisan.lastName}`)

    return (
        <>
            {/* ── Group-forward hero ── */}
            <section className="relative">
                <div className="relative h-48 w-full overflow-hidden sm:h-60">
                    <ScMedia src={coverUrl} alt={`${group.name} cover`} fallback={<IndigoDotsCover />} sizes="100vw" priority />
                    <Link
                        href="/groups"
                        aria-label="Back to communities"
                        className="absolute left-4 top-4 z-10 inline-flex rounded-[var(--sc-r-btn)] p-2 text-white/90 backdrop-blur transition-colors hover:bg-white/15"
                        style={{ background: 'rgba(26,39,48,0.35)' }}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </div>

                <div className="sc-container">
                    <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end">
                        {/* Logo tile */}
                        <div
                            className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[var(--sc-r-tile)] sm:h-32 sm:w-32"
                            style={{ border: '4px solid var(--sc-surface)', boxShadow: 'var(--sc-shadow-hero)' }}
                        >
                            <ScMedia src={logoUrl} alt={`${group.name} logo`} fallback={<KraftMonogram name={group.name} />} sizes="128px" />
                        </div>

                        <div className="min-w-0 flex-1 pb-1">
                            <h1 className="sc-h1" style={{ fontSize: '40px' }}>{group.name}</h1>
                            {group.location && (
                                <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: 'var(--sc-text-soft)' }}>
                                    <MapPin className="h-4 w-4" style={{ color: 'var(--sc-accent)' }} />
                                    {group.location}
                                </p>
                            )}
                            {/* Member stack */}
                            {memberNames.length > 0 && (
                                <div className="mt-3 flex items-center gap-3">
                                    <div className="sc-stack">
                                        {memberNames.slice(0, 6).map((name, idx) => (
                                            <span key={idx} className="sc-avatar h-9 w-9 text-xs" style={{ background: tintFor(name), borderColor: 'var(--sc-surface)' }} title={name}>
                                                {initialsFor(name)}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="sc-meta">{group.memberships.length} {t('members')}</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 flex-wrap gap-3 pb-1">
                            {canManage && (
                                <Link href={`/groups/${group.slug}/manage`} className="sc-btn sc-btn--primary">
                                    <Pencil className="h-4 w-4" />
                                    {t('editGroup')}
                                </Link>
                            )}
                            {group.website && (
                                <a href={group.website} target="_blank" rel="noopener noreferrer" className="sc-btn sc-btn--ghost">
                                    <Globe className="h-4 w-4" />
                                    {t('website')}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Collective stat strip */}
                    <div className="mt-8 flex overflow-hidden rounded-[var(--sc-r-card)]" style={{ border: '1px solid var(--sc-border)', background: 'var(--sc-surface-trans)' }}>
                        <Stat value={group.memberships.length} label={t('members')} />
                        <Stat value={collectiveCrafts.length} label={tNav('crafts')} divider />
                        <Stat value={founded} label="est." divider />
                        {group.organizationType !== 'OTHER' && (
                            <Stat value={t(`orgType_${group.organizationType}`)} label={t('organizationType')} divider />
                        )}
                    </div>

                    {/* Credential badges */}
                    {(group.isHeritageCraft || group.isOpenToMembers || group.hasTrainingProgram || group.certifications.length > 0) && (
                        <div className="mt-5 flex flex-wrap gap-2">
                            {group.isHeritageCraft && (
                                <span className="sc-badge" style={{ ['--t' as string]: 'var(--sc-ochre)' }}><BookOpen className="h-3.5 w-3.5" />{t('heritageCraft')}</span>
                            )}
                            {group.isOpenToMembers && (
                                <span className="sc-badge" style={{ ['--t' as string]: 'var(--sc-olive)' }}><DoorOpen className="h-3.5 w-3.5" />{t('openToMembers')}</span>
                            )}
                            {group.hasTrainingProgram && (
                                <span className="sc-badge" style={{ ['--t' as string]: 'var(--sc-plum)' }}><GraduationCap className="h-3.5 w-3.5" />{t('trainingProgram')}</span>
                            )}
                            {group.certifications.map(cert => (
                                <span key={cert} className="sc-badge" style={{ ['--t' as string]: 'var(--sc-teal)' }}><Award className="h-3.5 w-3.5" />{t(`cert_${cert}`)}</span>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ── About / story ── */}
            {group.description && (
                <div className="sc-container py-10">
                    <p className="sc-eyebrow mb-3">{t('description')}</p>
                    <p className="sc-lead max-w-3xl whitespace-pre-line">{group.description}</p>
                </div>
            )}

            {/* ── Member roster ── */}
            <div className="sc-container pb-12">
                <SectionHeader title={t('members')} className="mb-6" />

                {group.memberships.length === 0 ? (
                    <div className="rounded-[var(--sc-r-card)] border border-dashed p-12 text-center" style={{ borderColor: 'var(--sc-border-strong)' }}>
                        <Users className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--sc-text-muted)' }} />
                        <p className="sc-body">{t('noMembers')}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        {admins.length > 0 && (
                            <div>
                                <p className="sc-meta mb-3">{t('admin')}</p>
                                <div className="grid gap-[var(--sc-grid-gap)] sm:grid-cols-2 lg:grid-cols-3">
                                    {admins.map(m => (
                                        <MemberCard key={m.id} artisan={m.artisan} photoUrl={photoMap.get(m.artisan.id) || null} isAdmin />
                                    ))}
                                </div>
                            </div>
                        )}
                        {members.length > 0 && (
                            <div>
                                <p className="sc-meta mb-3">{t('member')}</p>
                                <div className="grid gap-[var(--sc-grid-gap)] sm:grid-cols-2 lg:grid-cols-3">
                                    {members.map(m => (
                                        <MemberCard key={m.id} artisan={m.artisan} photoUrl={photoMap.get(m.artisan.id) || null} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Collective crafts wall ── */}
            {collectiveCrafts.length > 0 && (
                <div className="sc-container pb-16">
                    <SectionHeader title={tNav('crafts')} className="mb-6" />
                    <div className="grid gap-[var(--sc-grid-gap)] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {collectiveCrafts.map(craft => (
                            <Link key={craft.id} href={`/crafts/${craft.id}`} className="sc-card group block">
                                <div className="relative aspect-square overflow-hidden">
                                    <ScMedia src={craft.imageUrl} alt={craft.title} fallback={<IndigoDotsCover />} sizes="(max-width:768px) 50vw, 25vw" className="transition-transform duration-300 group-hover:scale-105" />
                                </div>
                                <div className="p-3">
                                    <p className="line-clamp-1 text-sm font-medium transition-colors group-hover:text-[color:var(--sc-accent)]" style={{ color: 'var(--sc-text)' }}>{craft.title}</p>
                                    <p className="sc-meta mt-0.5 truncate">{craft.maker}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}

function Stat({ value, label, divider }: { value: React.ReactNode; label: string; divider?: boolean }) {
    return (
        <div className="flex-1 p-4 text-center" style={divider ? { borderLeft: '1px solid var(--sc-border)' } : undefined}>
            <p style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '20px', color: 'var(--sc-ink)' }}>{value}</p>
            <p className="sc-meta mt-0.5">{label}</p>
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
    const fullName = `${artisan.firstName} ${artisan.lastName}`
    return (
        <Link href={`/artisans/${artisan.slug}`} className="sc-card group flex items-start gap-4 p-4">
            <div
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full"
                style={{ border: '2px solid var(--sc-surface)', boxShadow: 'var(--sc-shadow-card)' }}
            >
                <ScMedia src={photoUrl} alt={fullName} fallback={<PortraitFallback name={fullName} />} sizes="56px" />
            </div>
            <div className="min-w-0">
                <p className="transition-colors group-hover:text-[color:var(--sc-accent)]" style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '16px', color: 'var(--sc-ink)' }}>
                    {fullName}
                </p>
                {isAdmin && (
                    <span className="sc-badge mt-1" style={{ ['--t' as string]: 'var(--sc-accent)' }}>Admin</span>
                )}
                {artisan.bio && (
                    <p className="mt-1 line-clamp-2 text-sm" style={{ color: 'var(--sc-text-muted)' }}>{artisan.bio}</p>
                )}
            </div>
        </Link>
    )
}
