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

    const story = artisan
        ? await prisma.craftStory.findUnique({
              where: { artisanId: artisan.id },
              select: { status: true, lastStepReached: true },
          })
        : null

    const storyBanner: { state: 'none' | 'draft' | 'published'; progress: number; slug: string | null } = story
        ? {
              state: story.status === 'PUBLISHED' ? 'published' : 'draft',
              progress: story.lastStepReached,
              slug: artisan?.slug ?? null,
          }
        : { state: 'none', progress: 0, slug: artisan?.slug ?? null }

    return (
        <ArtisanProfileForm
            artisan={artisan}
            photoUrl={photoUrl}
            coverUrl={coverUrl}
            myGroups={myGroups}
            storyBanner={storyBanner}
        />
    )
}
