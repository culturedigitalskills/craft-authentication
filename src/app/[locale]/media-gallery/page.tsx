import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { MediaGalleryManager } from '@/components/media-gallery/MediaGalleryManager'

export default async function MediaGalleryPage() {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const artisan = await prisma.artisan.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    })
    if (!artisan) redirect('/onboarding')

    const t = await getTranslations('mediaGallery')

    const attachments = await prisma.mediaAttachment.findMany({
        where: { entityType: 'Artisan', entityId: artisan.id, attachmentType: 'GALLERY' },
        include: { media: { select: { mimeType: true } } },
        orderBy: { displayOrder: 'asc' },
    })

    const initialItems = attachments.map((a) => ({
        attachmentId: a.id,
        mediaId: a.mediaId,
        url: `/api/media/${a.mediaId}`,
        mimeType: a.media.mimeType,
        isPublic: a.isPublic,
    }))

    return (
        <Container>
            <PageHeader title={t('title')} description={t('description')} />
            <MediaGalleryManager artisanId={artisan.id} initialItems={initialItems} />
        </Container>
    )
}
