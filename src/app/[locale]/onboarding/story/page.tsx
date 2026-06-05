import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { CraftStoryWizard, type CraftStoryDraft } from '@/components/onboarding/CraftStoryWizard'
import type { WorkshopMedia } from '@/components/onboarding/StoryWorkshopUpload'

export default async function OnboardingStoryPage() {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const artisan = await prisma.artisan.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    })
    if (!artisan) redirect('/onboarding/artisan')

    const story = await prisma.craftStory.findUnique({
        where: { artisanId: artisan.id },
    })

    const workshopAttachments = story
        ? await prisma.mediaAttachment.findMany({
              where: {
                  entityType: 'CraftStory',
                  entityId: story.id,
                  attachmentType: 'PROCESS',
              },
              include: { media: { select: { mimeType: true } } },
              orderBy: { displayOrder: 'asc' },
          })
        : []

    const workshopMedia: WorkshopMedia[] = workshopAttachments.map(a => ({
        attachmentId: a.id,
        mediaId: a.mediaId,
        url: `/api/media/${a.mediaId}`,
        isVideo: (a.media.mimeType ?? '').startsWith('video/'),
    }))

    const initial: CraftStoryDraft | null = story
        ? {
              id: story.id,
              status: story.status,
              lastStepReached: story.lastStepReached,
              updatedAt: story.updatedAt.toISOString(),
              answerSelfText: story.answerSelfText,
              answerSelfMediaId: story.answerSelfMediaId,
              answerCraftText: story.answerCraftText,
              answerCraftMediaId: story.answerCraftMediaId,
              answerMeaningText: story.answerMeaningText,
              answerMeaningMediaId: story.answerMeaningMediaId,
              answerBenefitsText: story.answerBenefitsText,
              answerBenefitsMediaId: story.answerBenefitsMediaId,
              answerFutureText: story.answerFutureText,
              answerFutureMediaId: story.answerFutureMediaId,
              answerChallengesText: story.answerChallengesText,
              answerChallengesMediaId: story.answerChallengesMediaId,
          }
        : null

    const maxUploadMb = parseInt(process.env.MAX_MEDIA_SIZE ?? '100', 10) || 100

    return (
        <CraftStoryWizard
            initialStory={initial}
            initialWorkshopMedia={workshopMedia}
            maxUploadMb={maxUploadMb}
        />
    )
}
