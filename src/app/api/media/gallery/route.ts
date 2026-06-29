import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'

/**
 * List the current user's reusable gallery images and videos, for picking when
 * creating or editing a craft. (YouTube links remain a separate input.)
 */
export async function GET() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const artisan = await prisma.artisan.findUnique({
        where: { userId: session!.user.id },
        select: { id: true },
    })
    if (!artisan) return NextResponse.json([])

    const attachments = await prisma.mediaAttachment.findMany({
        where: { entityType: 'Artisan', entityId: artisan.id, attachmentType: 'GALLERY' },
        include: { media: { select: { mimeType: true } } },
        orderBy: { displayOrder: 'asc' },
    })

    const seen = new Set<string>()
    const items = attachments
        .filter(a => a.media.mimeType?.startsWith('image/') || a.media.mimeType?.startsWith('video/'))
        .filter(a => (seen.has(a.mediaId) ? false : (seen.add(a.mediaId), true)))
        .map(a => ({ mediaId: a.mediaId, url: `/api/media/${a.mediaId}`, mimeType: a.media.mimeType }))

    return NextResponse.json(items)
}
