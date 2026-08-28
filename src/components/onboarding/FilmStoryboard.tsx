'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Film, Play } from 'lucide-react'
import { buildFilmPlan, validateIngredients, type FilmInputs } from '@/lib/film/planner'
import { ANSWER_KEYS, type AnswerKey } from '@/lib/validations/craftStory'
import type { TranscriptSegment } from '@/lib/vtt'
import type { WorkshopMedia } from './StoryWorkshopUpload'

export interface StoryboardAnswer {
    key: AnswerKey
    mediaId: string
    kind: 'audio' | 'video'
}

/**
 * Live preview of the film the artisan would get, built from the same planner
 * the renderer uses. Rendering a real film takes minutes of ffmpeg, which made
 * arranging workshop media a guess: change the order, render, wait, look. This
 * recomputes locally on every change so the effect of a reorder is immediate.
 *
 * Shot lengths come from how long each answer was spoken, so the durations are
 * read from the media in the browser rather than probed on the server.
 */
export function FilmStoryboard({
    answers,
    workshopMedia,
    segments,
}: {
    answers: StoryboardAnswer[]
    workshopMedia: WorkshopMedia[]
    segments: Record<string, TranscriptSegment[]>
}) {
    const t = useTranslations('craftStory.storyboard')
    const tStory = useTranslations('craftStory')
    const [durations, setDurations] = useState<Record<string, number>>({})
    // Media already asked about, so a re-render does not measure it twice.
    const requested = useRef<Set<string>>(new Set())
    const mounted = useRef(true)
    useEffect(() => () => {
        mounted.current = false
    }, [])

    // Read each spoken answer's length straight from the media element. Cheap
    // (metadata only, and the media route serves ranges), and it avoids adding a
    // server probe just to preview. Anything that fails to load reports zero and
    // its chapter drops out of the plan below.
    //
    // Only unmounting discards a result. Cancelling on every re-run would strand
    // measurements permanently: any background save gives `answers` a new
    // identity, and the run that replaced the cancelled one skips those ids
    // because `requested` already holds them. A late result is still the right
    // duration for its media, so it is always worth keeping.
    useEffect(() => {
        for (const answer of answers) {
            if (requested.current.has(answer.mediaId)) continue
            requested.current.add(answer.mediaId)

            void measureMediaDuration(answer.kind, `/api/media/${answer.mediaId}`).then(value => {
                if (!mounted.current) return
                setDurations(prev => ({ ...prev, [answer.mediaId]: value }))
            })
        }
    }, [answers])

    // Duration per answer, from the transcript when there is one and from the
    // browser otherwise. The transcript's last cue lands within a second of the
    // real length, arrives with data the panel already fetched, and cannot hang
    // the way reading a header-less MediaRecorder file can. A browser
    // measurement, when it succeeds, is exact and takes precedence.
    const effectiveDurations = useMemo(() => {
        const out: Record<string, number> = {}
        for (const answer of answers) {
            const measured = durations[answer.mediaId] ?? 0
            const cues = segments[answer.mediaId]
            const fromTranscript = cues && cues.length > 0 ? cues[cues.length - 1].end : 0
            out[answer.mediaId] = measured > 0 ? measured : fromTranscript
        }
        return out
    }, [answers, durations, segments])

    const plan = useMemo(() => {
        const inputs: FilmInputs = {
            // The storyboard shows structure and timing, not the rendered card
            // text, so the name and profile URL are not needed here.
            artisanName: '',
            profileUrl: '',
            chapters: ANSWER_KEYS.map(key => {
                const answer = answers.find(a => a.key === key)
                const duration = answer ? (effectiveDurations[answer.mediaId] ?? 0) : 0
                return {
                    key,
                    titleCardText: '',
                    voiceMediaId: answer?.mediaId ?? null,
                    voiceKind: answer?.kind ?? null,
                    voiceDurationSec: duration,
                    segments: answer ? (segments[answer.mediaId] ?? null) : null,
                }
            }),
            visuals: workshopMedia.map(m => ({
                mediaId: m.mediaId,
                kind: m.isVideo ? ('video' as const) : ('image' as const),
            })),
            templateVersion: 1,
        }

        if (!validateIngredients(inputs).ok) return null
        return buildFilmPlan(inputs)
    }, [answers, effectiveDurations, workshopMedia, segments])

    // Whether a film is possible at all, judged on what exists rather than on
    // measured durations. Deciding this from the plan alone would conflate "no
    // recordings yet" with "still reading their lengths", and the panel would
    // silently vanish in both cases.
    const hasIngredients =
        answers.length > 0 && (workshopMedia.length > 0 || answers.some(a => a.kind === 'video'))
    if (!hasIngredients) return null

    const measured = answers.some(a => (effectiveDurations[a.mediaId] ?? 0) > 0)

    if (!measured || !plan) {
        return (
            <section className="mt-8 rounded-lg border border-border bg-muted/20 p-4">
                <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                    <Film className="h-4 w-4" />
                    {t('title')}
                </h2>
                <p className="text-xs text-muted-foreground">{t('measuring')}</p>
            </section>
        )
    }

    const captionsPending = answers.some(a => !segments[a.mediaId])

    return (
        <section className="mt-8 rounded-lg border border-border bg-muted/20 p-4">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Film className="h-4 w-4" />
                {t('title')}
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
                {t('total', { duration: formatDuration(plan.totalDurationSec) })}
                {captionsPending ? ` ${t('approxHint')}` : ''}
            </p>

            <div className="flex flex-col gap-4">
                {plan.chapters.map(chapter => (
                    <div key={chapter.key}>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {tStory(`step${ANSWER_KEYS.indexOf(chapter.key) + 1}.title`)}
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {chapter.shots.map((shot, i) => (
                                <div
                                    key={`${chapter.key}-${i}`}
                                    className="relative h-16 w-24 shrink-0 overflow-hidden rounded border border-border bg-muted"
                                >
                                    {shot.source.type === 'image' ? (
                                        <Image
                                            src={`/api/media/${shot.source.mediaId}`}
                                            alt=""
                                            fill
                                            sizes="96px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <>
                                            {/* A muted video with metadata preloaded paints its
                                                first frame, which beats a blank placeholder for
                                                telling one clip from another. Same approach the
                                                craft gallery uses for local video tiles. */}
                                            <video
                                                src={`/api/media/${shot.source.mediaId}`}
                                                muted
                                                playsInline
                                                preload="metadata"
                                                className="absolute inset-0 h-full w-full object-cover"
                                            />
                                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                                <Play className="h-4 w-4 fill-white text-white drop-shadow" />
                                            </span>
                                        </>
                                    )}
                                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
                                        {shot.durationSec.toFixed(1)}s
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

// Give up on a recording that never reports a length, rather than leaving the
// panel waiting on it. The transcript fallback covers whatever lands here.
const MEASURE_TIMEOUT_MS = 5000

/**
 * Resolve a recording's length in the browser, resolving 0 when it cannot be
 * determined. Never rejects, so a single unreadable file cannot stall the rest.
 *
 * In-browser recordings are written by MediaRecorder without a container
 * duration header, so the browser reports Infinity until it has seen the end of
 * the stream. Seeking far past the end makes it work the length out. This is the
 * client-side counterpart of the decode-to-null fallback that probeDuration uses
 * on the server (see lib/ffmpeg.ts).
 */
function measureMediaDuration(kind: 'audio' | 'video', src: string): Promise<number> {
    return new Promise(resolve => {
        const el = document.createElement(kind === 'video' ? 'video' : 'audio')
        el.preload = 'metadata'

        let settled = false
        const finish = (value: number) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            el.removeEventListener('loadedmetadata', onLoaded)
            el.removeEventListener('durationchange', onProgress)
            el.removeEventListener('timeupdate', onProgress)
            el.removeEventListener('error', onError)
            // Drop the source so the browser stops buffering the file.
            el.removeAttribute('src')
            el.load()
            resolve(value)
        }

        const hasLength = () => Number.isFinite(el.duration) && el.duration > 0
        const onProgress = () => {
            if (hasLength()) finish(el.duration)
        }
        const onError = () => finish(0)
        const onLoaded = () => {
            if (hasLength()) {
                finish(el.duration)
                return
            }
            // Some browsers report the resolved length through timeupdate after
            // the seek rather than through durationchange.
            el.addEventListener('durationchange', onProgress)
            el.addEventListener('timeupdate', onProgress)
            try {
                el.currentTime = 1e101
            } catch {
                finish(0)
            }
        }

        const timer = setTimeout(() => finish(0), MEASURE_TIMEOUT_MS)
        el.addEventListener('loadedmetadata', onLoaded)
        el.addEventListener('error', onError)
        el.src = src
    })
}

function formatDuration(seconds: number): string {
    const total = Math.round(seconds)
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${String(s).padStart(2, '0')}`
}
