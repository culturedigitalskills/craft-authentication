'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { CaptionedVideo } from '@/components/shared/CaptionedVideo'
import { ANSWER_KEYS } from '@/lib/validations/craftStory'
import { formatDuration } from '@/lib/media-duration'
import type { ChapterMarks } from '@/lib/film/markers'

export function StoryFilmHero({
    outputMediaId,
    hasCaptions,
    chapters,
}: {
    outputMediaId: string
    hasCaptions: boolean
    chapters: ChapterMarks
}) {
    const t = useTranslations('craftStory')
    const player = useRef<HTMLDivElement>(null)
    function playFrom(seconds: number) {
        const video = player.current?.querySelector('video')
        if (!video) return
        video.currentTime = seconds
        void video.play().catch(() => video.focus())
    }
    return (
        <div ref={player} className="space-y-3">
            <CaptionedVideo
                src={'/api/media/' + outputMediaId}
                captionsSrc={hasCaptions ? '/api/media/' + outputMediaId + '/subtitles' : undefined}
                captionsLabel={t('captionsLabel')}
                preload="metadata"
                className="aspect-video w-full rounded-xl bg-black"
            />
            <p className="text-sm text-muted-foreground">
                {hasCaptions ? t('captions.ready') : t('studio.noCaptions')}
            </p>
            {chapters.length > 0 && (
                <nav aria-label={t('studio.chapters')} className="flex flex-wrap gap-2">
                    {chapters.map((m) => (
                        <button
                            type="button"
                            key={m.key}
                            onClick={() => playFrom(m.startSec)}
                            className="rounded-full border px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2"
                        >
                            <span className="font-mono">{formatDuration(m.startSec)}</span>
                            {' · '}
                            {t(
                                ('step' +
                                    (ANSWER_KEYS.indexOf(m.key) + 1) +
                                    '.title') as 'step1.title',
                            )}
                        </button>
                    ))}
                </nav>
            )}
        </div>
    )
}
