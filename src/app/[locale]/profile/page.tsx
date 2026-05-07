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
            country: true,
            region: true,
            socialInstagram: true,
            socialFacebook: true,
            socialTwitter: true,
            socialTiktok: true,
            socialYoutube: true,
            website: true,
            hashtags: true,
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

    // Fetch gallery photos via MediaAttachment
    const galleryAttachments = artisan
        ? await prisma.mediaAttachment.findMany({
              where: {
                  entityType: 'Artisan',
                  entityId: artisan.id,
                  attachmentType: 'GALLERY',
              },
              select: { id: true, mediaId: true },
              orderBy: { displayOrder: 'asc' },
          })
        : []

    const galleryImages = galleryAttachments.map(a => ({
        id: a.id,
        mediaId: a.mediaId,
        url: `/api/media/${a.mediaId}`,
    }))

    // Fetch group memberships for the artisan
    const groupMemberships = artisan
        ? await prisma.artisanGroupMembership.findMany({
              where: { artisanId: artisan.id, leftDate: null },
              include: {
                  group: {
                      select: { id: true, name: true, slug: true },
                  },
              },
              orderBy: { joinedDate: 'asc' },
          })
        : []

    const myGroups = groupMemberships.map(m => ({
        membershipId: m.id,
        role: m.role,
        group: m.group,
    }))

    return <ArtisanProfileForm artisan={artisan} photoUrl={photoUrl} coverUrl={coverUrl} galleryImages={galleryImages} myGroups={myGroups} />
}
