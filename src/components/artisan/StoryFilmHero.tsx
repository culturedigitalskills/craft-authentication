import { useTranslations } from 'next-intl'
import { CaptionedVideo } from '@/components/shared/CaptionedVideo'

interface StoryFilmHeroProps {
    outputMediaId: string
    summaryText: string | null
}

/**
 * Film-first public rendering: the story film is the story. The film (with its
 * soft caption track) plus the written summary tell it in full, so there's no
 * separate Q&A section.
 */
export function StoryFilmHero({ outputMediaId, summaryText }: StoryFilmHeroProps) {
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
        </section>
    )
}
