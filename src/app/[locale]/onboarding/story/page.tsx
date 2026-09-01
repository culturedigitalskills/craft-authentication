import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { CraftStoryWizard, type CraftStoryDraft } from '@/components/onboarding/CraftStoryWizard'
import type { WorkshopMedia } from '@/components/onboarding/StoryWorkshopUpload'
import { ANSWER_MEDIA_FIELDS } from '@/lib/validations/craftStory'

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
              summaryText: story.summaryText,
              consentedAt: story.consentedAt?.toISOString() ?? null,
          }
        : null

    // Mime types of saved answer media, so reloaded previews render video
    // players (with captions) instead of falling back to audio.
    const answerMediaIds = story
        ? ANSWER_MEDIA_FIELDS.map(k => story[k]).filter((v): v is string => typeof v === 'string')
        : []
    let answerMediaMimeTypes: Record<string, string> = {}
    if (answerMediaIds.length > 0) {
        const files = await prisma.mediaFile.findMany({
            where: { id: { in: answerMediaIds } },
            select: { id: true, mimeType: true },
        })
        answerMediaMimeTypes = Object.fromEntries(files.map(f => [f.id, f.mimeType]))
    }

    return (
        <CraftStoryWizard
            initialStory={initial}
            initialWorkshopMedia={workshopMedia}
            answerMediaMimeTypes={answerMediaMimeTypes}
        />
    )
}
