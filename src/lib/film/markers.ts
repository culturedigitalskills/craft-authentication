import { z } from 'zod'
import { ANSWER_KEYS } from '@/lib/validations/craftStory'

const marks = z.array(z.object({ key: z.enum(ANSWER_KEYS), startSec: z.number().nonnegative() }))
export type ChapterMarks = z.infer<typeof marks>
export const readChapterMarks = (value: unknown): ChapterMarks => marks.safeParse(value).data ?? []
