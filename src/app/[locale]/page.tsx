import Link from 'next/link'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, MapPin, UserRound, ShieldCheck, QrCode, ScanLine, BadgeCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCraftPrimaryImageMap } from '@/lib/craft'
import { ScMedia } from '@/components/sc/ScMedia'
import { PortraitFallback, IndigoDotsCover, KraftMonogram, initialsFor, tintFor } from '@/components/sc/fallbacks'

// Masonry rhythm for the featured-crafts teaser.
const TEASER_RATIOS = ['4 / 5', '1 / 1', '3 / 4', '5 / 6']

export default async function Home() {
    const t = await getTranslations('home')
    const tg = await getTranslations('groups')

    // ── Live data: featured artisans, communities, crafts ──
    const [artisanRecords, groupRecords, craftRecords] = await Promise.all([
        prisma.artisan.findMany({
            where: { deletedAt: null },
            select: { id: true, firstName: true, lastName: true, slug: true, bio: true, country: true, region: true, hashtags: true },
            orderBy: { createdAt: 'desc' },
            take: 3,
        }),
        prisma.group.findMany({
            where: { isActive: true },
            include: { _count: { select: { memberships: true } } },
            orderBy: { createdAt: 'desc' },
            take: 3,
        }),
        prisma.craft.findMany({
            where: { isPublic: true, deletedAt: null },
            select: { id: true, title: true, artisan: { select: { firstName: true, lastName: true, slug: true } } },
            orderBy: { createdAt: 'desc' },
            take: 4,
        }),
    ])

    const artisanIds = artisanRecords.map(a => a.id)
    const groupIds = groupRecords.map(g => g.id)

    const [artisanPhotos, groupLogos, groupMembers, craftImageMap] = await Promise.all([
        artisanIds.length
            ? prisma.mediaAttachment.findMany({ where: { entityType: 'Artisan', entityId: { in: artisanIds }, attachmentType: 'HERO', isPrimary: true }, select: { entityId: true, mediaId: true } })
            : [],
        groupIds.length
            ? prisma.mediaAttachment.findMany({ where: { entityType: 'Group', entityId: { in: groupIds }, attachmentType: 'HERO', isPrimary: true }, select: { entityId: true, mediaId: true } })
            : [],
        groupIds.length
            ? prisma.artisanGroupMembership.findMany({ where: { groupId: { in: groupIds }, leftDate: null }, select: { groupId: true, artisan: { select: { firstName: true, lastName: true } } }, orderBy: { joinedDate: 'asc' } })
            : [],
        getCraftPrimaryImageMap(craftRecords.map(c => c.id)),
    ])

    const artisanPhotoMap = new Map(artisanPhotos.map(p => [p.entityId, `/api/media/${p.mediaId}`]))
    const groupLogoMap = new Map(groupLogos.map(p => [p.entityId, `/api/media/${p.mediaId}`]))
    const membersByGroup = new Map<string, string[]>()
    for (const m of groupMembers) {
        const list = membersByGroup.get(m.groupId) ?? []
        list.push(`${m.artisan.firstName} ${m.artisan.lastName}`)
        membersByGroup.set(m.groupId, list)
    }

    const artisans = artisanRecords.map(a => ({
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        slug: a.slug,
        photoUrl: artisanPhotoMap.get(a.id) ?? null,
        location: a.region && a.country ? `${a.region}, ${a.country}` : a.country ?? null,
        specialty: a.hashtags?.[0] ?? null,
        story: a.bio?.trim() || t('artisans.story'),
    }))

    const crafts = craftRecords.map(c => ({
        id: c.id,
        title: c.title,
        maker: `${c.artisan.firstName} ${c.artisan.lastName}`,
        makerSlug: c.artisan.slug,
        imageUrl: craftImageMap.has(c.id) ? `/api/media/${craftImageMap.get(c.id)}` : null,
    }))

    const featured = artisans[0] ?? null

    return (
        <>
            {/* ── 1. Hero ── */}
            <section className="sc-container grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
                <div>
                    <p className="sc-eyebrow mb-4">{t('hero.chipKicker')}</p>
                    <h1 className="sc-h1">
                        {t('hero.headlineLead')}{' '}
                        <em style={{ fontStyle: 'italic', color: 'var(--sc-accent)' }}>{t('hero.headlineEmphasis')}</em>
                    </h1>
                    <p className="sc-lead mt-6 max-w-xl">{t('hero.subcopy')}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link href="/artisans" className="sc-btn sc-btn--primary">
                            {t('hero.ctaMakers')}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link href="/crafts" className="sc-btn sc-btn--ghost">
                            {t('hero.ctaCrafts')}
                        </Link>
                    </div>
                </div>

                {/* People-forward collage */}
                <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                    <div
                        className="relative overflow-hidden"
                        style={{ aspectRatio: '4 / 5', borderRadius: 'var(--sc-r-hero)', boxShadow: 'var(--sc-shadow-hero)', border: '1px solid var(--sc-border)' }}
                    >
                        <ScMedia
                            src={featured?.photoUrl}
                            alt={featured?.name ?? t('hero.chipKicker')}
                            fallback={<PortraitFallback name={featured?.name ?? 'Artisan'} />}
                            sizes="(max-width: 1024px) 90vw, 40vw"
                            priority
                        />
                    </div>

                    {/* Woven-textile inset */}
                    <div
                        className="absolute -left-6 -top-6 hidden h-32 w-32 overflow-hidden sm:block"
                        style={{ borderRadius: 'var(--sc-r-card)', boxShadow: 'var(--sc-shadow-raise)', border: '4px solid var(--sc-surface)' }}
                    >
                        <IndigoDotsCover />
                    </div>

                    {/* Floating maker chip */}
                    {featured && (
                        <Link
                            href={`/artisans/${featured.slug}`}
                            className="sc-card absolute -bottom-5 -right-2 flex items-center gap-3 p-3 sm:-right-6"
                            style={{ maxWidth: '15rem' }}
                        >
                            <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full" style={{ border: '2px solid var(--sc-surface)' }}>
                                <ScMedia src={featured.photoUrl} alt={featured.name} fallback={<PortraitFallback name={featured.name} />} sizes="44px" />
                            </span>
                            <span className="min-w-0">
                                <span className="sc-meta block">{t('hero.chipKicker')}</span>
                                <span className="block truncate" style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '15px', color: 'var(--sc-ink)' }}>
                                    {featured.name}
                                </span>
                            </span>
                        </Link>
                    )}
                </div>
            </section>

            {/* ── 2. Trust strip ── */}
            <section className="sc-container">
                <div
                    className="grid gap-px overflow-hidden rounded-[var(--sc-r-card)] sm:grid-cols-3"
                    style={{ border: '1px solid var(--sc-border)', background: 'var(--sc-border)' }}
                >
                    {[
                        { Icon: MapPin, pillar: t('trust.rooted.title'), desc: t('trust.rooted.description') },
                        { Icon: UserRound, pillar: t('trust.named.title'), desc: t('trust.named.description') },
                        { Icon: ShieldCheck, pillar: t('trust.verified.title'), desc: t('trust.verified.description') },
                    ].map(({ Icon, pillar, desc }) => (
                        <div key={pillar} className="flex items-start gap-3 p-5" style={{ background: 'var(--sc-surface-trans)' }}>
                            <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--sc-accent)' }} />
                            <div>
                                <p style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '16px', color: 'var(--sc-ink)' }}>{pillar}</p>
                                <p className="sc-body mt-0.5" style={{ fontSize: '14px' }}>{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 3. Meet the artisans ── */}
            {artisans.length > 0 && (
                <section className="sc-container py-16">
                    <div className="mb-8 flex items-end justify-between gap-4">
                        <div>
                            <p className="sc-eyebrow mb-2">{t('artisans.eyebrow')}</p>
                            <h2 className="sc-h2">{t('artisans.title')}</h2>
                        </div>
                        <Link href="/artisans" className="shrink-0 text-sm font-semibold hover:underline" style={{ color: 'var(--sc-accent)' }}>
                            {t('artisans.viewAll')} →
                        </Link>
                    </div>

                    <div className="grid gap-[var(--sc-grid-gap)] sm:grid-cols-2 lg:grid-cols-3">
                        {artisans.map(a => {
                            const hue = tintFor(a.slug)
                            return (
                                <Link key={a.id} href={`/artisans/${a.slug}`} className="sc-card group block">
                                    <div className="relative h-24 overflow-hidden">
                                        <IndigoDotsCover style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${hue} 70%, var(--sc-ink)) 0%, var(--sc-ink) 100%)` }} />
                                    </div>
                                    <div className="px-5 pb-5">
                                        <span className="relative -mt-10 mb-3 block h-20 w-20 overflow-hidden rounded-full" style={{ border: '3px solid var(--sc-surface)', boxShadow: 'var(--sc-shadow-card)' }}>
                                            <ScMedia src={a.photoUrl} alt={a.name} fallback={<PortraitFallback name={a.name} />} sizes="80px" className="transition-transform duration-300 group-hover:scale-105" />
                                        </span>
                                        <h3 className="sc-h2 transition-colors group-hover:text-[color:var(--sc-accent)]" style={{ fontSize: '20px' }}>{a.name}</h3>
                                        <p className="sc-meta mt-1">
                                            {[a.specialty, a.location].filter(Boolean).join(' · ')}
                                        </p>
                                        <p className="mt-2 line-clamp-2 sc-body" style={{ fontSize: '14px' }}>{a.story}</p>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* ── 4. Communities band (dark) ── */}
            {groupRecords.length > 0 && (
                <section className="sc-dark py-16" style={{ background: 'var(--sc-ink)' }}>
                    <div className="sc-container">
                        <div className="mb-8 flex items-end justify-between gap-4">
                            <div>
                                <p className="sc-eyebrow mb-2">{t('communities.eyebrow')}</p>
                                <h2 className="sc-h2" style={{ color: 'var(--sc-text-on-dark)' }}>{t('communities.title')}</h2>
                                <p className="mt-2 max-w-xl" style={{ color: 'var(--sc-text-on-dark-muted)' }}>{t('communities.body')}</p>
                            </div>
                            <Link href="/groups" className="shrink-0 text-sm font-semibold hover:underline" style={{ color: 'var(--sc-accent-warm)' }}>
                                {t('communities.viewAll')} →
                            </Link>
                        </div>

                        <div className="grid gap-[var(--sc-grid-gap)] sm:grid-cols-2 lg:grid-cols-3">
                            {groupRecords.map(g => {
                                const members = membersByGroup.get(g.id) ?? []
                                const orgLabel = g.organizationType !== 'OTHER' ? tg(`orgType_${g.organizationType}`) : null
                                return (
                                    <Link key={g.id} href={`/groups/${g.slug}`} className="sc-dark-panel group block p-5 transition-transform duration-200 hover:-translate-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-[var(--sc-r-tile)]">
                                                <ScMedia src={groupLogoMap.get(g.id)} alt={g.name} fallback={<KraftMonogram name={g.name} />} sizes="56px" />
                                            </span>
                                            <div className="min-w-0">
                                                <h3 className="truncate" style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '18px', color: 'var(--sc-text-on-dark)' }}>{g.name}</h3>
                                                <p className="sc-meta mt-0.5" style={{ color: 'var(--sc-text-on-dark-muted)' }}>
                                                    {[g.location, orgLabel].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                        </div>
                                        {members.length > 0 && (
                                            <div className="mt-4 flex items-center gap-3">
                                                <div className="sc-stack">
                                                    {members.slice(0, 5).map((name, idx) => (
                                                        <span key={idx} className="sc-avatar h-8 w-8 text-[11px]" style={{ background: tintFor(name), borderColor: 'var(--sc-ink)' }} title={name}>
                                                            {initialsFor(name)}
                                                        </span>
                                                    ))}
                                                </div>
                                                <span className="sc-meta" style={{ color: 'var(--sc-text-on-dark-muted)' }}>{g._count.memberships} {t('communities.makers')}</span>
                                            </div>
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ── 5. Featured crafts ── */}
            {crafts.length > 0 && (
                <section className="sc-container py-16">
                    <div className="mb-8 flex items-end justify-between gap-4">
                        <div>
                            <p className="sc-eyebrow mb-2">{t('crafts.eyebrow')}</p>
                            <h2 className="sc-h2">{t('crafts.title')}</h2>
                        </div>
                        <Link href="/crafts" className="shrink-0 text-sm font-semibold hover:underline" style={{ color: 'var(--sc-accent)' }}>
                            {t('crafts.viewAll')} →
                        </Link>
                    </div>

                    <div className="[column-gap:var(--sc-grid-gap)] columns-2 lg:columns-4">
                        {crafts.map((c, i) => (
                            <Link key={c.id} href={`/crafts/${c.id}`} className="sc-card sc-card--hover group mb-[var(--sc-grid-gap)] block break-inside-avoid">
                                <div className="relative w-full overflow-hidden" style={{ aspectRatio: TEASER_RATIOS[i % TEASER_RATIOS.length] }}>
                                    <ScMedia src={c.imageUrl} alt={c.title} fallback={<IndigoDotsCover />} sizes="(max-width: 1024px) 50vw, 25vw" className="transition-transform duration-300 group-hover:scale-[1.04]" />
                                </div>
                                <div className="p-4">
                                    <h3 className="line-clamp-1" style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '16px', color: 'var(--sc-ink)' }}>{c.title}</h3>
                                    <p className="sc-meta mt-1 truncate">{t('crafts.by')} {c.maker}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ── 6. Provenance, not paperwork ── */}
            <section className="sc-container pb-20">
                <div
                    className="grid items-center gap-10 overflow-hidden rounded-[var(--sc-r-hero)] p-8 sm:p-12 lg:grid-cols-2"
                    style={{ background: 'color-mix(in srgb, var(--sc-accent) 6%, var(--sc-surface))', border: '1px solid color-mix(in srgb, var(--sc-accent) 18%, transparent)' }}
                >
                    <div>
                        <p className="sc-eyebrow mb-3">{t('provenance.eyebrow')}</p>
                        <h2 className="sc-h2">{t('provenance.title')}</h2>
                        <p className="sc-body mt-4 max-w-lg">{t('provenance.body')}</p>
                        <ul className="mt-6 flex flex-col gap-3">
                            {[
                                { Icon: BadgeCheck, text: t('provenance.point1') },
                                { Icon: ScanLine, text: t('provenance.point2') },
                                { Icon: ShieldCheck, text: t('provenance.point3') },
                            ].map(({ Icon, text }) => (
                                <li key={text} className="flex items-center gap-2.5 sc-body" style={{ fontSize: '15px' }}>
                                    <Icon className="h-4 w-4 shrink-0" style={{ color: 'var(--sc-accent)' }} />
                                    {text}
                                </li>
                            ))}
                        </ul>
                        <Link href="/crafts" className="sc-btn sc-btn--ghost mt-7">
                            {t('provenance.cta')}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {/* Certificate / QR card */}
                    <div className="mx-auto w-full max-w-xs">
                        <div className="sc-card flex flex-col items-center gap-4 p-6">
                            <span className="sc-badge" style={{ ['--t' as string]: 'var(--sc-teal)' }}>
                                <QrCode className="h-3.5 w-3.5" />
                                {t('provenance.eyebrow')}
                            </span>
                            <div className="overflow-hidden rounded-[var(--sc-r-btn)] bg-[var(--sc-surface)] p-2" style={{ border: '1px solid var(--sc-border)' }}>
                                <Image
                                    src="/media/tagimagefabric.png"
                                    alt={t('trust.verified.title')}
                                    width={1024}
                                    height={768}
                                    sizes="(max-width: 1024px) 80vw, 18rem"
                                    className="h-auto w-full rounded-[calc(var(--sc-r-btn)-4px)] object-cover"
                                    unoptimized
                                />
                            </div>
                            <p className="sc-meta text-center">{t('trust.verified.title')}</p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
