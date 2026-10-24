import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth-guard'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { MediaGalleryManager } from '@/components/media-gallery/MediaGalleryManager'

interface PageProps {
    params: Promise<{ id: string }>
}

/**
 * An artisan's gallery, managed by a site admin.
 *
 * Deliberately the same component the artisan uses on their own gallery: it
 * already takes the artisan id as a prop, and every endpoint behind it already
 * admits an admin, so moderating somebody's media needs no second
 * implementation that could drift from the first.
 */
export default async function AdminArtisanMediaPage({ params }: PageProps) {
    await requireAdminSession()
    const { id } = await params
    const t = await getTranslations('admin')

    const artisan = await prisma.artisan.findUnique({
        where: { id },
        select: { id: true, slug: true, firstName: true, lastName: true, deletedAt: true },
    })
    if (!artisan) notFound()

    const attachments = await prisma.mediaAttachment.findMany({
        where: { entityType: 'Artisan', entityId: artisan.id, attachmentType: 'GALLERY' },
        include: { media: { select: { mimeType: true } } },
        orderBy: { displayOrder: 'asc' },
    })

    const name = `${artisan.firstName} ${artisan.lastName}`.trim()

    return (
        <Container>
            <Link
                href={`/artisans/${artisan.slug}`}
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: 'var(--sc-accent)' }}
            >
                <ArrowLeft className="h-4 w-4" />
                {t('backToProfile')}
            </Link>

            <PageHeader
                title={t('mediaFor', { name })}
                description={
                    artisan.deletedAt ? t('mediaRemovedHint') : t('mediaHint')
                }
            />

            <MediaGalleryManager
                artisanId={artisan.id}
                initialItems={attachments.map((a) => ({
                    attachmentId: a.id,
                    mediaId: a.mediaId,
                    url: `/api/media/${a.mediaId}`,
                    mimeType: a.media.mimeType,
                    isPublic: a.isPublic,
                }))}
            />
        </Container>
    )
}
