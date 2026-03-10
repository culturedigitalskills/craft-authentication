import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ArtisanProfileForm } from '@/components/profile/ArtisanProfileForm'

export default async function ProfilePage() {
    const session = await auth()
    if (!session?.user) {
        redirect('/login')
    }

    const artisan = await prisma.artisan.findUnique({
        where: { userId: session.user.id },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            slug: true,
            bio: true,
            yearsOfExperience: true,
            learningSource: true,
            regionId: true,
            region: {
                select: {
                    id: true,
                    name: true,
                    country: { select: { id: true, name: true } },
                },
            },
        },
    })

    // Fetch profile photo via MediaAttachment (polymorphic)
    const photoAttachment = artisan
        ? await prisma.mediaAttachment.findFirst({
              where: {
                  entityType: 'Artisan',
                  entityId: artisan.id,
                  attachmentType: 'HERO',
                  isPrimary: true,
              },
              select: { mediaId: true },
          })
        : null

    const photoUrl = photoAttachment ? `/api/media/${photoAttachment.mediaId}` : null

    // Fetch cover photo via MediaAttachment
    const coverAttachment = artisan
        ? await prisma.mediaAttachment.findFirst({
              where: {
                  entityType: 'Artisan',
                  entityId: artisan.id,
                  attachmentType: 'COVER',
                  isPrimary: true,
              },
              select: { mediaId: true },
          })
        : null

    const coverUrl = coverAttachment ? `/api/media/${coverAttachment.mediaId}` : null

    return <ArtisanProfileForm artisan={artisan} photoUrl={photoUrl} coverUrl={coverUrl} />
}
