import { useTranslations } from 'next-intl'
import { CaptionedVideo } from '@/components/shared/CaptionedVideo'
import {
    CraftStoryDisplay,
    type PublishedCraftStory,
    type WorkshopMediaItem,
} from './CraftStoryDisplay'

interface StoryFilmHeroProps {
    outputMediaId: string
    summaryText: string | null
    story: PublishedCraftStory
    workshop: WorkshopMediaItem[]
    answerMediaMimeTypes: Record<string, string>
    captionedMediaIds: string[]
}

/**
 * Film-first public rendering: the story film as the hero, the editable summary
 * beneath it, and the full Q&A tucked into a native <details> for readers who
 * want the words (and for search engines / screen readers — it stays in the DOM).
 */
export function StoryFilmHero({
    outputMediaId,
    summaryText,
    story,
    workshop,
    answerMediaMimeTypes,
    captionedMediaIds,
}: StoryFilmHeroProps) {
    const t = useTranslations('craftStory')

    return (
        <section id="craft-story" className="scroll-mt-24">
            <p className="sc-eyebrow mb-2">{t('publicHeading')}</p>
            <h2 className="sc-h2 mb-6">{t('publicTitle')}</h2>

            <div
                className="overflow-hidden rounded-[var(--sc-r-card)] p-2"
                style={{ border: '1px solid var(--sc-border)', background: 'var(--sc-surface-trans)' }}
            >
                <CaptionedVideo
                    src={`/api/media/${outputMediaId}`}
                    captionsSrc={`/api/media/${outputMediaId}/subtitles`}
                    captionsLabel={t('captionsLabel')}
                    className="mx-auto w-full rounded-[var(--sc-r-btn)] bg-black"
                    preload="metadata"
                />
            </div>

            {summaryText?.trim() && (
                <p className="sc-lead mt-6 whitespace-pre-line">{summaryText}</p>
            )}

            <details className="mt-6">
                <summary
                    className="cursor-pointer text-sm font-medium"
                    style={{ color: 'var(--sc-accent)' }}
                >
                    {t('publicFilm.readFullStory')}
                </summary>
                <div className="mt-6">
                    <CraftStoryDisplay
                        nested
                        story={story}
                        workshop={workshop}
                        answerMediaMimeTypes={answerMediaMimeTypes}
                        captionedMediaIds={captionedMediaIds}
                    />
                </div>
            </details>
        </section>
    )
}
