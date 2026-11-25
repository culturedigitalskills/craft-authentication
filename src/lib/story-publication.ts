import { ANSWER_MEDIA_FIELDS, ANSWER_TEXT_FIELDS } from '@/lib/validations/craftStory'

type AnswerField = (typeof ANSWER_TEXT_FIELDS | typeof ANSWER_MEDIA_FIELDS)[number]
export type StoryAnswers = Record<AnswerField, string | null>

// Allowlist content: a future internal draft field must never become public by accident.
export function editionAnswers(source: Partial<StoryAnswers>): StoryAnswers {
    return Object.fromEntries(
        [...ANSWER_TEXT_FIELDS, ...ANSWER_MEDIA_FIELDS].map((field) => [
            field,
            typeof source[field] === 'string' ? source[field] : null,
        ]),
    ) as StoryAnswers
}

export function editionMediaIds(answers: StoryAnswers, workshopIds: string[]) {
    return [
        ...new Set(
            [...ANSWER_MEDIA_FIELDS.map((k) => answers[k]), ...workshopIds].filter(
                (id): id is string => Boolean(id),
            ),
        ),
    ]
}
