import { z } from 'zod'

// Single source of truth — order is the wizard step order (1..6).
export const ANSWER_KEYS = ['Self', 'Craft', 'Meaning', 'Benefits', 'Future', 'Challenges'] as const
export type AnswerKey = (typeof ANSWER_KEYS)[number]

export const ANSWER_TEXT_FIELDS = ANSWER_KEYS.map(k => `answer${k}Text` as const)
export const ANSWER_MEDIA_FIELDS = ANSWER_KEYS.map(k => `answer${k}MediaId` as const)

const textAnswer = z.string().max(5000).optional().nullable()
const mediaId = z.uuid().optional().nullable()

export const UpdateCraftStorySchema = z.object({
    lastStepReached: z.number().int().min(0).max(8).optional(),
    expectedUpdatedAt: z.string().datetime().optional(),
    answerSelfText: textAnswer,
    answerSelfMediaId: mediaId,
    answerCraftText: textAnswer,
    answerCraftMediaId: mediaId,
    answerMeaningText: textAnswer,
    answerMeaningMediaId: mediaId,
    answerBenefitsText: textAnswer,
    answerBenefitsMediaId: mediaId,
    answerFutureText: textAnswer,
    answerFutureMediaId: mediaId,
    answerChallengesText: textAnswer,
    answerChallengesMediaId: mediaId,
})

export type UpdateCraftStory = z.infer<typeof UpdateCraftStorySchema>
