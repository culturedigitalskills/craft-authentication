import { prisma } from '@/lib/prisma'
import { mediaKind } from '@/lib/media-kind'
import { ANSWER_KEYS } from '@/lib/validations/craftStory'

export interface FilmIngredientCounts {
    // Answer media that is audio or video (a spoken answer).
    spokenCount: number
    // Answer media that is specifically video (usable as a talking-head visual).
    videoAnswerCount: number
    // Workshop visuals (image or video).
    workshopCount: number
}

/**
 * The single rule for whether a story has the raw material for a film: at least
 * one spoken answer AND at least one visual (workshop media, or a video answer
 * that can stand in as a talking head). Shared by the film API and the publish
 * gate so they never disagree.
 */
export function canMakeFilm(counts: FilmIngredientCounts): boolean {
    return counts.spokenCount >= 1 && (counts.workshopCount >= 1 || counts.videoAnswerCount >= 1)
}

/**
 * Count a story's film ingredients from DB metadata (no media download).
 */
export async function getFilmIngredients(
    story: { id: string } & Record<string, unknown>,
): Promise<FilmIngredientCounts> {
    const answerMediaIds = ANSWER_KEYS.map(k => story[`answer${k}MediaId`] as string | null).filter(
        (v): v is string => typeof v === 'string',
    )
    const mediaRows = await prisma.mediaFile.findMany({
        where: { id: { in: answerMediaIds } },
        select: { id: true, mimeType: true },
    })
    let spokenCount = 0
    let videoAnswerCount = 0
    for (const m of mediaRows) {
        const kind = mediaKind(m.mimeType)
        if (kind === 'audio' || kind === 'video') spokenCount++
        if (kind === 'video') videoAnswerCount++
    }

    const workshop = await prisma.mediaAttachment.findMany({
        where: { entityType: 'CraftStory', entityId: story.id, attachmentType: 'PROCESS' },
        include: { media: { select: { mimeType: true } } },
    })
    const workshopCount = workshop.filter(a => a.media && mediaKind(a.media.mimeType) !== 'audio').length

    return { spokenCount, videoAnswerCount, workshopCount }
}
