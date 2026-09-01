import type { TranscriptSegment } from '@/lib/vtt'
import type { AnswerKey } from '@/lib/validations/craftStory'

// Pure timeline planner for the story film. No I/O, no ffmpeg — it turns the
// resolved ingredients (spoken answers + a visual pool) into a deterministic
// FilmPlan the renderer executes, plus the film-global caption track. Kept
// side-effect free so it can be unit-tested in isolation, and free of node
// built-ins so the wizard can run it in the browser to preview a film before
// anything is rendered (computeInputsHash lives in ./hash for that reason).

export const FILM_WIDTH = 1280
export const FILM_HEIGHT = 720
export const FILM_FPS = 30

const INTRO_CARD_SEC = 3.0
const TITLE_CARD_SEC = 2.6
const OUTRO_CARD_SEC = 4.0
// A shot never holds shorter than this, so the picture doesn't flash by.
const MIN_SHOT_SEC = 2.5
// Fallback cut interval when a chapter has no transcript to snap to.
const DEFAULT_SHOT_SEC = 4.0

export type VisualKind = 'image' | 'video'

export interface FilmVisual {
    mediaId: string
    kind: VisualKind
}

export interface FilmChapterInput {
    key: AnswerKey
    // Localized question title, already resolved by the caller.
    titleCardText: string
    // The spoken answer's media, or null for a text-only / empty answer.
    voiceMediaId: string | null
    voiceKind: 'audio' | 'video' | null
    voiceDurationSec: number
    // English transcript for this answer if READY, else null (no cut-snapping).
    segments: TranscriptSegment[] | null
}

export interface FilmInputs {
    artisanName: string
    profileUrl: string
    // In ANSWER_KEYS order; chapters without a spoken answer are skipped.
    chapters: FilmChapterInput[]
    // Workshop media in displayOrder.
    visuals: FilmVisual[]
    templateVersion: number
}

export type FilmShotSource =
    | { type: 'image'; mediaId: string; panDirection: 'in' | 'out' }
    | { type: 'video'; mediaId: string }
    | { type: 'talkingHead'; mediaId: string }

export interface FilmShot {
    source: FilmShotSource
    durationSec: number
}

export interface PlannedChapter {
    key: AnswerKey
    titleCard: { text: string; durationSec: number }
    voiceMediaId: string
    voiceKind: 'audio' | 'video'
    voiceDurationSec: number
    shots: FilmShot[]
}

export interface FilmPlan {
    width: number
    height: number
    fps: number
    intro: { text: string; durationSec: number }
    chapters: PlannedChapter[]
    outro: { name: string; profileUrl: string; durationSec: number }
    captionSegments: TranscriptSegment[]
    totalDurationSec: number
}

export type IngredientCheck = { ok: true } | { ok: false; reason: 'NO_SPOKEN_ANSWER' | 'NO_VISUAL' }

function spokenChapters(inputs: FilmInputs): FilmChapterInput[] {
    return inputs.chapters.filter(
        c => c.voiceMediaId !== null && c.voiceKind !== null && c.voiceDurationSec > 0,
    )
}

/**
 * A film needs at least one spoken answer and at least one visual. The visual
 * pool is the workshop media, or — when there is none — the talking-head video
 * of any spoken chapter that was recorded on camera.
 */
export function validateIngredients(inputs: FilmInputs): IngredientCheck {
    const spoken = spokenChapters(inputs)
    if (spoken.length === 0) return { ok: false, reason: 'NO_SPOKEN_ANSWER' }
    const hasTalkingHead = spoken.some(c => c.voiceKind === 'video')
    if (inputs.visuals.length === 0 && !hasTalkingHead) return { ok: false, reason: 'NO_VISUAL' }
    return { ok: true }
}

// Cut a chapter's voice duration into shot lengths. With a transcript, cuts
// snap to segment ends (never producing a shot shorter than MIN_SHOT_SEC);
// without one, cuts fall on a fixed interval. Always sums exactly to duration.
function cutDurations(durationSec: number, segments: TranscriptSegment[] | null): number[] {
    const cuts: number[] = []
    let start = 0
    let segIdx = 0
    // Guard against pathological inputs (many tiny segments) with a hard cap.
    const maxShots = 200
    while (start < durationSec - 0.05 && cuts.length < maxShots) {
        let cut: number
        if (segments && segments.length > 0) {
            cut = durationSec
            for (; segIdx < segments.length; segIdx++) {
                const segEnd = segments[segIdx].end
                if (segEnd - start >= MIN_SHOT_SEC) {
                    cut = Math.min(segEnd, durationSec)
                    segIdx++
                    break
                }
            }
        } else {
            cut = Math.min(start + DEFAULT_SHOT_SEC, durationSec)
        }
        // Don't leave a sliver shorter than the minimum hold at the tail.
        if (durationSec - cut < MIN_SHOT_SEC) cut = durationSec
        cuts.push(cut - start)
        start = cut
    }
    // If the shot cap was hit before covering the whole answer, fold the rest
    // into a final shot — otherwise the shots sum to less than the voice and the
    // muxed audio gets truncated by -shortest.
    if (start < durationSec - 0.05) cuts.push(durationSec - start)
    if (cuts.length === 0) cuts.push(durationSec)
    return cuts
}

/**
 * Build the full film timeline. Assumes validateIngredients already passed.
 * Visuals are assigned round-robin across all shots of all chapters (so every
 * chapter gets fresh imagery and a sparse pool loops), with image pans
 * alternating direction. Caption segments are offset to film-global time.
 */
export function buildFilmPlan(inputs: FilmInputs): FilmPlan {
    const spoken = spokenChapters(inputs)

    // Effective visual pool: workshop media, or talking heads when there is none.
    const pool: FilmShotSource[] =
        inputs.visuals.length > 0
            ? inputs.visuals.map(v =>
                  v.kind === 'image'
                      ? { type: 'image', mediaId: v.mediaId, panDirection: 'in' }
                      : { type: 'video', mediaId: v.mediaId },
              )
            : spoken
                  .filter(c => c.voiceKind === 'video')
                  .map(c => ({ type: 'talkingHead', mediaId: c.voiceMediaId as string }))

    const captionSegments: TranscriptSegment[] = []
    const chapters: PlannedChapter[] = []

    let clock = INTRO_CARD_SEC
    let poolIndex = 0
    let shotCounter = 0

    for (const chapter of spoken) {
        clock += TITLE_CARD_SEC
        const voiceStart = clock
        const durations = cutDurations(chapter.voiceDurationSec, chapter.segments)

        const shots: FilmShot[] = durations.map(durationSec => {
            const base = pool[poolIndex % pool.length]
            poolIndex++
            let source: FilmShotSource = base
            if (base.type === 'image') {
                source = {
                    type: 'image',
                    mediaId: base.mediaId,
                    panDirection: shotCounter % 2 === 0 ? 'in' : 'out',
                }
            }
            shotCounter++
            return { source, durationSec }
        })

        chapters.push({
            key: chapter.key,
            titleCard: { text: chapter.titleCardText, durationSec: TITLE_CARD_SEC },
            voiceMediaId: chapter.voiceMediaId as string,
            voiceKind: chapter.voiceKind as 'audio' | 'video',
            voiceDurationSec: chapter.voiceDurationSec,
            shots,
        })

        if (chapter.segments) {
            for (const seg of chapter.segments) {
                captionSegments.push({
                    start: seg.start + voiceStart,
                    end: seg.end + voiceStart,
                    text: seg.text,
                })
            }
        }

        clock += chapter.voiceDurationSec
    }

    clock += OUTRO_CARD_SEC

    return {
        width: FILM_WIDTH,
        height: FILM_HEIGHT,
        fps: FILM_FPS,
        intro: { text: inputs.artisanName, durationSec: INTRO_CARD_SEC },
        chapters,
        outro: { name: inputs.artisanName, profileUrl: inputs.profileUrl, durationSec: OUTRO_CARD_SEC },
        captionSegments,
        totalDurationSec: clock,
    }
}

// Escape text for an ffmpeg drawtext `text='...'` value. The renderer prefers
// textfile= to sidestep this, but inline callers use it as a safety net.
export function escapeDrawtext(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/:/g, '\\:')
        .replace(/'/g, "\\'")
        .replace(/%/g, '\\%')
}
