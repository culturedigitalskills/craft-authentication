import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Clock, GraduationCap, Users, Globe } from 'lucide-react'
import { FaInstagram, FaFacebook, FaXTwitter, FaYoutube, FaTiktok } from 'react-icons/fa6'
import { GalleryGrid } from '@/components/shared/GalleryGrid'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { CraftStoryDisplay, type WorkshopMediaItem } from '@/components/artisan/CraftStoryDisplay'
import { ANSWER_MEDIA_FIELDS } from '@/lib/validations/craftStory'
import { getCraftPrimaryImageMap } from '@/lib/craft'
import { ScMedia } from '@/components/sc/ScMedia'
import { PortraitFallback, IndigoDotsCover } from '@/components/sc/fallbacks'
import { SectionHeader } from '@/components/sc/SectionHeader'

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const artisan = await prisma.artisan.findFirst({
        where: { OR: [{ slug }, { previousSlugs: { has: slug } }], deletedAt: null },
        select: { id: true, firstName: true, lastName: true, bio: true },
    })
    if (!artisan) return { title: 'Artisan Not Found' }

    const title = `${artisan.firstName} ${artisan.lastName} — Artisan Profile`
    const description =
        artisan.bio?.slice(0, 160) ??
        `Discover the craft of ${artisan.firstName} ${artisan.lastName}.`

    // Use profile photo as OG image if available
    const photoAttachment = await prisma.mediaAttachment.findFirst({
        where: {
            entityType: 'Artisan',
            entityId: artisan.id,
            attachmentType: 'HERO',
            isPrimary: true,
        },
        select: { mediaId: true },
    })
    const ogImage = photoAttachment ? `/api/media/${photoAttachment.mediaId}` : undefined

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'profile',
            ...(ogImage && { images: [{ url: ogImage, alt: title }] }),
        },
        twitter: {
            card: ogImage ? 'summary_large_image' : 'summary',
            title,
            description,
            ...(ogImage && { images: [ogImage] }),
        },
    }
}

export default async function ArtisanPublicProfilePage({ params }: PageProps) {
    const { slug } = await params
    const t = await getTranslations('artisanProfile')

    const artisan = await prisma.artisan.findFirst({
        where: { OR: [{ slug }, { previousSlugs: { has: slug } }], deletedAt: null },
        select: {
            id: true,
            userId: true,
            slug: true,
            firstName: true,
            lastName: true,
            bio: true,
            yearsOfExperience: true,
            learningSource: true,
            country: true,
            region: true,
            socialInstagram: true,
            socialFacebook: true,
            socialTwitter: true,
            socialTiktok: true,
            socialYoutube: true,
            website: true,
            hashtags: true,
            user: { select: { email: true } },
            memberships: {
                where: { leftDate: null },
                select: {
                    role: true,
                    group: {
                        select: {
                            name: true,
                            slug: true,
                        },
                    },
                },
            },
        },
    })

    if (!artisan) notFound()

    // Requested via a retired slug — send to the current canonical URL.
    if (artisan.slug !== slug) redirect(`/artisans/${artisan.slug}`)

    // Fetch the artisan's public crafts
    const craftRecords = await prisma.craft.findMany({
        where: { artisanId: artisan.id, isPublic: true, deletedAt: null },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
    })

    const craftImageMap = await getCraftPrimaryImageMap(craftRecords.map((c) => c.id))
    const crafts = craftRecords.map((record) => ({
        id: record.id,
        name: record.title,
        imageUrl: craftImageMap.has(record.id) ? `/api/media/${craftImageMap.get(record.id)}` : null,
    }))

    const photoAttachment = await prisma.mediaAttachment.findFirst({
        where: {
            entityType: 'Artisan',
            entityId: artisan.id,
            attachmentType: 'HERO',
            isPrimary: true,
        },
        select: { mediaId: true },
    })

    const photoUrl = photoAttachment ? `/api/media/${photoAttachment.mediaId}` : null

    const coverAttachment = await prisma.mediaAttachment.findFirst({
        where: {
            entityType: 'Artisan',
            entityId: artisan.id,
            attachmentType: 'COVER',
            isPrimary: true,
        },
        select: { mediaId: true },
    })

    const coverUrl = coverAttachment ? `/api/media/${coverAttachment.mediaId}` : null

    const galleryAttachments = await prisma.mediaAttachment.findMany({
        where: {
            entityType: 'Artisan',
            entityId: artisan.id,
            attachmentType: 'GALLERY',
            isPublic: true,
        },
        select: { id: true, mediaId: true, media: { select: { mimeType: true } } },
        orderBy: { displayOrder: 'asc' },
    })

    const galleryImages = galleryAttachments.map((a) => ({
        id: a.id,
        mediaId: a.mediaId,
        url: `/api/media/${a.mediaId}`,
        mimeType: a.media.mimeType,
    }))

    const publishedStory = await prisma.craftStory.findUnique({
        where: { artisanId: artisan.id },
    })
    const story = publishedStory && publishedStory.status === 'PUBLISHED' ? publishedStory : null

    let workshopMedia: WorkshopMediaItem[] = []
    let answerMediaMimeTypes: Record<string, string> = {}
    if (story) {
        const workshopAttachments = await prisma.mediaAttachment.findMany({
            where: {
                entityType: 'CraftStory',
                entityId: story.id,
                attachmentType: 'PROCESS',
            },
            include: { media: { select: { mimeType: true } } },
            orderBy: { displayOrder: 'asc' },
        })
        workshopMedia = workshopAttachments.map((a) => ({
            mediaId: a.mediaId,
            isVideo: (a.media.mimeType ?? '').startsWith('video/'),
        }))

        const answerMediaIds = ANSWER_MEDIA_FIELDS.map((k) => story[k]).filter((v): v is string =>
            Boolean(v),
        )
        if (answerMediaIds.length > 0) {
            const files = await prisma.mediaFile.findMany({
                where: { id: { in: answerMediaIds } },
                select: { id: true, mimeType: true },
            })
            answerMediaMimeTypes = Object.fromEntries(files.map((f) => [f.id, f.mimeType]))
        }
    }

    const locationText =
        artisan.region && artisan.country ? `${artisan.region}, ${artisan.country}` : null

    const socials = [
        artisan.socialInstagram && { Icon: FaInstagram, label: `@${artisan.socialInstagram}`, href: `https://instagram.com/${artisan.socialInstagram}` },
        artisan.socialFacebook && { Icon: FaFacebook, label: artisan.socialFacebook, href: `https://facebook.com/${artisan.socialFacebook}` },
        artisan.socialTwitter && { Icon: FaXTwitter, label: `@${artisan.socialTwitter}`, href: `https://x.com/${artisan.socialTwitter}` },
        artisan.socialTiktok && { Icon: FaTiktok, label: `@${artisan.socialTiktok}`, href: `https://tiktok.com/@${artisan.socialTiktok}` },
        artisan.socialYoutube && { Icon: FaYoutube, label: artisan.socialYoutube, href: `https://youtube.com/@${artisan.socialYoutube}` },
        artisan.website && { Icon: Globe, label: artisan.website.replace(/^https?:\/\//, ''), href: artisan.website },
    ].filter(Boolean) as { Icon: React.ComponentType<{ className?: string }>; label: string; href: string }[]

    return (
        <>
            {/* ── Hero: cover band + overlapping portrait ── */}
            <section className="relative">
                <div className="relative h-56 w-full overflow-hidden sm:h-72">
                    <ScMedia
                        src={coverUrl}
                        alt="Cover"
                        fallback={<IndigoDotsCover />}
                        sizes="100vw"
                        priority
                    />
                </div>

                <div className="sc-container">
                    <div className="-mt-16 flex flex-col items-start gap-4 sm:-mt-20 sm:flex-row sm:items-start">
                        <div
                            className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full sm:h-40 sm:w-40"
                            style={{ border: '4px solid var(--sc-surface)', boxShadow: 'var(--sc-shadow-hero)' }}
                        >
                            <ScMedia
                                src={photoUrl}
                                alt={`${artisan.firstName} ${artisan.lastName}`}
                                fallback={<PortraitFallback name={`${artisan.firstName} ${artisan.lastName}`} />}
                                sizes="160px"
                                priority
                            />
                        </div>
                        <div className="sm:pt-24">
                            <p className="sc-eyebrow">{t('about')}</p>
                            <h1 className="sc-h1 mt-1" style={{ fontSize: '44px' }}>
                                {artisan.firstName} {artisan.lastName}
                            </h1>
                            {/* Stat chips */}
                            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: 'var(--sc-text-soft)' }}>
                                {artisan.yearsOfExperience !== null && (
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-4 w-4" style={{ color: 'var(--sc-accent)' }} />
                                        <span style={{ color: 'var(--sc-text)', fontWeight: 600 }}>{artisan.yearsOfExperience}</span>
                                        {t('yearsExperience')}
                                    </span>
                                )}
                                {artisan.learningSource && (
                                    <span className="flex items-center gap-1.5">
                                        <GraduationCap className="h-4 w-4" style={{ color: 'var(--sc-accent)' }} />
                                        {artisan.learningSource}
                                    </span>
                                )}
                                {locationText && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4" style={{ color: 'var(--sc-accent)' }} />
                                        {locationText}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Story column + rail ── */}
            <div className="sc-container py-12">
                <div className="sc-split">
                    {/* Main story column */}
                    <div className="flex flex-col gap-12">
                        {artisan.bio && (
                            <p className="sc-lead whitespace-pre-line">{artisan.bio}</p>
                        )}

                        {story && (
                            <CraftStoryDisplay
                                story={story}
                                workshop={workshopMedia}
                                answerMediaMimeTypes={answerMediaMimeTypes}
                            />
                        )}

                        {/* Crafts */}
                        {crafts.length > 0 && (
                            <div>
                                <SectionHeader title={t('crafts')} className="mb-6" />
                                <div className="grid gap-[var(--sc-grid-gap)] sm:grid-cols-2 md:grid-cols-3">
                                    {crafts.map((craft) => (
                                        <Link key={craft.id} href={`/crafts/${craft.id}`} className="sc-card group block">
                                            <div className="relative aspect-square overflow-hidden">
                                                <ScMedia
                                                    src={craft.imageUrl}
                                                    alt={craft.name}
                                                    fallback={<IndigoDotsCover />}
                                                    sizes="(max-width: 768px) 50vw, 33vw"
                                                    className="transition-transform duration-300 group-hover:scale-105"
                                                />
                                            </div>
                                            <p className="line-clamp-1 p-3 text-sm font-medium transition-colors group-hover:text-[color:var(--sc-accent)]" style={{ color: 'var(--sc-text)' }}>
                                                {craft.name}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Gallery (masonry) */}
                        {galleryImages.length > 0 && (
                            <div>
                                <SectionHeader title={t('gallery')} className="mb-6" />
                                <GalleryGrid images={galleryImages} artisanUserId={artisan.userId} />
                            </div>
                        )}
                    </div>

                    {/* Rail: Connect + Communities + hashtags */}
                    <aside className="sc-sticky flex flex-col gap-6">
                        {socials.length > 0 && (
                            <div className="sc-card p-5">
                                <p className="sc-eyebrow mb-3">{t('connectWith')}</p>
                                <div className="flex flex-col gap-2">
                                    {socials.map((s, i) => (
                                        <a
                                            key={i}
                                            href={s.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2.5 text-sm transition-colors hover:text-[color:var(--sc-accent)]"
                                            style={{ color: 'var(--sc-text-soft)' }}
                                        >
                                            <s.Icon className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{s.label}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {artisan.memberships.length > 0 && (
                            <div className="sc-card p-5">
                                <p className="sc-eyebrow mb-3 flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" />
                                    {t('groups')}
                                </p>
                                <div className="flex flex-col gap-2">
                                    {artisan.memberships.map((m) => (
                                        <Link
                                            key={m.group.slug}
                                            href={`/groups/${m.group.slug}`}
                                            className="flex items-center justify-between gap-2 text-sm transition-colors hover:text-[color:var(--sc-accent)]"
                                            style={{ color: 'var(--sc-text-soft)' }}
                                        >
                                            <span className="truncate">{m.group.name}</span>
                                            {m.role === 'ADMIN' && (
                                                <span className="sc-badge shrink-0" style={{ ['--t' as string]: 'var(--sc-teal)' }}>Admin</span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {artisan.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {artisan.hashtags.map((tag) => (
                                    <span key={tag} className="sc-chip" style={{ cursor: 'default' }}>#{tag}</span>
                                ))}
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </>
    )
}
