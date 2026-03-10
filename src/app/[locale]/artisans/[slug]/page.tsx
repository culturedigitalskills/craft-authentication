import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { MapPin, Clock, GraduationCap, User } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const artisan = await prisma.artisan.findUnique({
        where: { slug, deletedAt: null },
        select: { firstName: true, lastName: true, bio: true },
    })
    if (!artisan) return { title: 'Artisan Not Found' }
    return {
        title: `${artisan.firstName} ${artisan.lastName} — Artisan Profile`,
        description: artisan.bio?.slice(0, 160) ?? undefined,
    }
}

export default async function ArtisanPublicProfilePage({ params }: PageProps) {
    const { slug } = await params
    const t = await getTranslations('artisanProfile')

    const artisan = await prisma.artisan.findUnique({
        where: { slug, deletedAt: null },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            bio: true,
            yearsOfExperience: true,
            learningSource: true,
            region: {
                select: {
                    name: true,
                    regionType: true,
                    country: { select: { name: true } },
                },
            },
        },
    })

    if (!artisan) notFound()

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
    const locationText = artisan.region
        ? `${artisan.region.name}, ${artisan.region.country.name}`
        : null

    return (
        <div className="-mt-16">
            {/* ── Hero Banner ── */}
            <section className="relative overflow-hidden border-b border-border/50 bg-muted/60 pb-16 pt-24">
                {coverUrl ? (
                    <Image
                        src={coverUrl}
                        alt="Cover photo"
                        fill
                        className="object-cover"
                        priority
                    />
                ) : (
                    <>
                        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl" />
                        <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/[0.07] blur-3xl" />
                    </>
                )}
                {coverUrl && <div className="absolute inset-0 bg-black/40" />}

                <div className="relative mx-auto max-w-4xl px-4 text-center">
                    <div className="mx-auto mb-4 h-28 w-28 overflow-hidden rounded-full border-4 border-background shadow-xl sm:h-36 sm:w-36">
                        {photoUrl ? (
                            <Image
                                src={photoUrl}
                                alt={`${artisan.firstName} ${artisan.lastName}`}
                                width={144}
                                height={144}
                                className="h-full w-full object-cover"
                                priority
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted">
                                <User className="h-12 w-12 text-muted-foreground" />
                            </div>
                        )}
                    </div>

                    <h1 className={`text-3xl font-bold tracking-tight sm:text-4xl ${coverUrl ? 'text-white' : ''}`}>
                        {artisan.firstName} {artisan.lastName}
                    </h1>

                    {locationText && (
                        <p className={`mt-1.5 inline-flex items-center gap-1.5 ${coverUrl ? 'text-white/80' : 'text-muted-foreground'}`}>
                            <MapPin className="h-4 w-4" />
                            {locationText}
                        </p>
                    )}
                </div>
            </section>

            {/* ── Stats Section ── */}
            <section className="border-b border-border/50 bg-background py-8">
                <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 px-4 sm:grid-cols-3">
                    {artisan.yearsOfExperience !== null && (
                        <div className="rounded-lg bg-muted/60 p-5 text-center">
                            <Clock className="mx-auto mb-2 h-6 w-6 text-primary" />
                            <p className="font-semibold">{artisan.yearsOfExperience} {t('yearsExperience')}</p>
                            <p className="text-xs text-muted-foreground">{t('craftJourney')}</p>
                        </div>
                    )}
                    {artisan.learningSource && (
                        <div className="rounded-lg bg-muted/60 p-5 text-center">
                            <GraduationCap className="mx-auto mb-2 h-6 w-6 text-primary" />
                            <p className="font-semibold">{artisan.learningSource}</p>
                            <p className="text-xs text-muted-foreground">{t('learnedFrom')}</p>
                        </div>
                    )}
                    {locationText && (
                        <div className="rounded-lg bg-muted/60 p-5 text-center">
                            <MapPin className="mx-auto mb-2 h-6 w-6 text-primary" />
                            <p className="font-semibold">{locationText}</p>
                            <p className="text-xs text-muted-foreground">{t('learnedFrom')}</p>
                        </div>
                    )}
                </div>
            </section>

            {/* ── About Section ── */}
            {artisan.bio && (
                <section className="bg-muted/40 py-10">
                    <div className="mx-auto max-w-3xl px-4">
                        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                            {t('about')}
                        </h2>
                        <div className="border-l-2 border-primary/30 pl-5">
                            <p className="text-base leading-relaxed text-foreground/80">
                                {artisan.bio}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* ── Gallery section (future) ── */}
        </div>
    )
}
