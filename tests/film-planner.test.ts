import { describe, it, expect } from 'vitest'
import {
    validateIngredients,
    buildFilmPlan,
    escapeDrawtext,
    type FilmInputs,
    type FilmChapterInput,
    type FilmVisual,
} from '@/lib/film/planner'
import { computeInputsHash } from '@/lib/film/hash'
import type { TranscriptSegment } from '@/lib/vtt'

// Evenly spaced segments (each `step` seconds long) covering `count` steps.
function evenSegments(count: number, step: number): TranscriptSegment[] {
    return Array.from({ length: count }, (_, i) => ({
        start: i * step,
        end: (i + 1) * step,
        text: `line ${i + 1}`,
    }))
}

function chapter(over: Partial<FilmChapterInput>): FilmChapterInput {
    return {
        key: 'Self',
        titleCardText: 'About Yourself',
        voiceMediaId: null,
        voiceKind: null,
        voiceDurationSec: 0,
        segments: null,
        ...over,
    }
}

function inputs(over: Partial<FilmInputs>): FilmInputs {
    return {
        artisanName: 'Amina',
        profileUrl: 'https://example.com/artisans/amina',
        chapters: [],
        visuals: [],
        templateVersion: 1,
        ...over,
    }
}

const img = (mediaId: string): FilmVisual => ({ mediaId, kind: 'image' })

describe('validateIngredients', () => {
    it('rejects when there is no spoken answer', () => {
        const res = validateIngredients(inputs({ visuals: [img('a')] }))
        expect(res).toEqual({ ok: false, reason: 'NO_SPOKEN_ANSWER' })
    })

    it('rejects a spoken answer with no visual and no on-camera answer', () => {
        const res = validateIngredients(
            inputs({
                chapters: [chapter({ voiceMediaId: 'v1', voiceKind: 'audio', voiceDurationSec: 8 })],
            }),
        )
        expect(res).toEqual({ ok: false, reason: 'NO_VISUAL' })
    })

    it('accepts a video answer as the only visual', () => {
        const res = validateIngredients(
            inputs({
                chapters: [chapter({ voiceMediaId: 'v1', voiceKind: 'video', voiceDurationSec: 8 })],
            }),
        )
        expect(res).toEqual({ ok: true })
    })

    it('accepts an audio answer plus a workshop image', () => {
        const res = validateIngredients(
            inputs({
                chapters: [chapter({ voiceMediaId: 'v1', voiceKind: 'audio', voiceDurationSec: 8 })],
                visuals: [img('a')],
            }),
        )
        expect(res).toEqual({ ok: true })
    })
})

describe('buildFilmPlan chapter selection', () => {
    it('keeps only spoken chapters, in input order', () => {
        const plan = buildFilmPlan(
            inputs({
                chapters: [
                    chapter({ key: 'Self', voiceMediaId: 'v1', voiceKind: 'audio', voiceDurationSec: 12, segments: evenSegments(4, 3) }),
                    chapter({ key: 'Craft' }), // text-only, no voice — skipped
                    chapter({ key: 'Meaning', voiceMediaId: 'v3', voiceKind: 'audio', voiceDurationSec: 6, segments: evenSegments(2, 3) }),
                ],
                visuals: [img('a'), img('b'), img('c')],
            }),
        )
        expect(plan.chapters.map(c => c.key)).toEqual(['Self', 'Meaning'])
    })
})

describe('buildFilmPlan cut snapping', () => {
    it('snaps cuts to segment ends and sums to the voice duration', () => {
        const plan = buildFilmPlan(
            inputs({
                chapters: [
                    chapter({ voiceMediaId: 'v1', voiceKind: 'audio', voiceDurationSec: 12, segments: evenSegments(4, 3) }),
                ],
                visuals: [img('a'), img('b'), img('c')],
            }),
        )
        const shots = plan.chapters[0].shots
        expect(shots.map(s => s.durationSec)).toEqual([3, 3, 3, 3])
        const total = shots.reduce((sum, s) => sum + s.durationSec, 0)
        expect(total).toBeCloseTo(12)
        expect(shots.every(s => s.durationSec >= 2.5)).toBe(true)
    })

    it('falls back to fixed-interval cuts without a transcript', () => {
        const plan = buildFilmPlan(
            inputs({
                chapters: [
                    chapter({ voiceMediaId: 'v1', voiceKind: 'audio', voiceDurationSec: 12, segments: null }),
                ],
                visuals: [img('a')],
            }),
        )
        expect(plan.chapters[0].shots.map(s => s.durationSec)).toEqual([4, 4, 4])
    })

    it('never emits a sub-minimum sliver at the tail', () => {
        const plan = buildFilmPlan(
            inputs({
                chapters: [
                    // Ends at 3 and 8; the 8->10 tail (2s) is folded into the prior shot.
                    chapter({
                        voiceMediaId: 'v1',
                        voiceKind: 'audio',
                        voiceDurationSec: 10,
                        segments: [
                            { start: 0, end: 3, text: 'a' },
                            { start: 3, end: 8, text: 'b' },
                        ],
                    }),
                ],
                visuals: [img('a')],
            }),
        )
        const shots = plan.chapters[0].shots
        expect(shots.every(s => s.durationSec >= 2.5)).toBe(true)
        expect(shots.reduce((s, x) => s + x.durationSec, 0)).toBeCloseTo(10)
    })
})

describe('buildFilmPlan visual assignment', () => {
    it('assigns visuals round-robin continuing across chapters', () => {
        const plan = buildFilmPlan(
            inputs({
                chapters: [
                    chapter({ key: 'Self', voiceMediaId: 'v1', voiceKind: 'audio', voiceDurationSec: 12, segments: evenSegments(4, 3) }),
                    chapter({ key: 'Craft', voiceMediaId: 'v2', voiceKind: 'audio', voiceDurationSec: 6, segments: evenSegments(2, 3) }),
                ],
                visuals: [img('A'), img('B'), img('C')],
            }),
        )
        const ids = (i: number) => plan.chapters[i].shots.map(s => (s.source as { mediaId: string }).mediaId)
        expect(ids(0)).toEqual(['A', 'B', 'C', 'A'])
        expect(ids(1)).toEqual(['B', 'C'])
    })

    it('alternates image pan direction across all shots', () => {
        const plan = buildFilmPlan(
            inputs({
                chapters: [
                    chapter({ voiceMediaId: 'v1', voiceKind: 'audio', voiceDurationSec: 12, segments: evenSegments(4, 3) }),
                ],
                visuals: [img('A')],
            }),
        )
        const pans = plan.chapters[0].shots.map(s => (s.source as { panDirection: string }).panDirection)
        expect(pans).toEqual(['in', 'out', 'in', 'out'])
    })

    it('falls back to talking-head visuals when there is no workshop media', () => {
        const plan = buildFilmPlan(
            inputs({
                chapters: [
                    chapter({ voiceMediaId: 'cam1', voiceKind: 'video', voiceDurationSec: 6, segments: evenSegments(2, 3) }),
                ],
                visuals: [],
            }),
        )
        const sources = plan.chapters[0].shots.map(s => s.source.type)
        expect(sources.every(t => t === 'talkingHead')).toBe(true)
    })
})

describe('buildFilmPlan captions and duration', () => {
    it('offsets caption cues to film-global time and keeps them within the film', () => {
        const plan = buildFilmPlan(
            inputs({
                chapters: [
                    chapter({ key: 'Self', voiceMediaId: 'v1', voiceKind: 'audio', voiceDurationSec: 12, segments: evenSegments(4, 3) }),
                    chapter({ key: 'Craft', voiceMediaId: 'v2', voiceKind: 'audio', voiceDurationSec: 6, segments: evenSegments(2, 3) }),
                ],
                visuals: [img('A')],
            }),
        )
        // First chapter voice starts after intro (3.0) + title card (2.6) = 5.6.
        expect(plan.captionSegments[0].start).toBeCloseTo(5.6)
        // Cues are monotonic and never run past the film end.
        for (let i = 1; i < plan.captionSegments.length; i++) {
            expect(plan.captionSegments[i].start).toBeGreaterThanOrEqual(plan.captionSegments[i - 1].start)
        }
        const lastEnd = plan.captionSegments[plan.captionSegments.length - 1].end
        expect(lastEnd).toBeLessThanOrEqual(plan.totalDurationSec)
    })

    it('computes total duration as intro + per-chapter (title + voice) + outro', () => {
        const plan = buildFilmPlan(
            inputs({
                chapters: [
                    chapter({ key: 'Self', voiceMediaId: 'v1', voiceKind: 'audio', voiceDurationSec: 12, segments: evenSegments(4, 3) }),
                    chapter({ key: 'Craft', voiceMediaId: 'v2', voiceKind: 'audio', voiceDurationSec: 6, segments: evenSegments(2, 3) }),
                ],
                visuals: [img('A')],
            }),
        )
        // 3.0 + (2.6 + 12) + (2.6 + 6) + 4.0
        expect(plan.totalDurationSec).toBeCloseTo(30.2)
    })
})

describe('computeInputsHash', () => {
    const base = inputs({
        chapters: [
            chapter({ key: 'Self', voiceMediaId: 'v1', voiceKind: 'audio', voiceDurationSec: 8 }),
            chapter({ key: 'Craft', voiceMediaId: 'v2', voiceKind: 'audio', voiceDurationSec: 8 }),
        ],
        visuals: [img('A'), img('B')],
    })

    it('is stable for the same ingredients', () => {
        expect(computeInputsHash(base)).toBe(computeInputsHash(inputs({ ...base })))
    })

    it('is insensitive to answer chapter ordering (same answer set)', () => {
        const reordered = inputs({ ...base, chapters: [...base.chapters].reverse() })
        expect(computeInputsHash(reordered)).toBe(computeInputsHash(base))
    })

    it('changes when a visual is reordered', () => {
        const swapped = inputs({ ...base, visuals: [img('B'), img('A')] })
        expect(computeInputsHash(swapped)).not.toBe(computeInputsHash(base))
    })

    it('changes when the template version changes', () => {
        expect(computeInputsHash(inputs({ ...base, templateVersion: 2 }))).not.toBe(computeInputsHash(base))
    })
})

describe('escapeDrawtext', () => {
    it('escapes the ffmpeg drawtext metacharacters', () => {
        expect(escapeDrawtext("a:b'c%d\\e")).toBe("a\\:b\\'c\\%d\\\\e")
    })
})
