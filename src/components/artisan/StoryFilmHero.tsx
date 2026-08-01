import { useTranslations } from 'next-intl'
import { CaptionedVideo } from '@/components/shared/CaptionedVideo'
import { ANSWER_KEYS } from '@/lib/validations/craftStory'
import type { PublishedCraftStory } from './CraftStoryDisplay'

interface StoryFilmHeroProps {
    outputMediaId: string
    summaryText: string | null
    story: PublishedCraftStory
}

/**
 * Film-first public rendering: the film (with its soft caption track) and the
 * written summary are the story. Recorded answers and workshop media are already
 * in the film, so the only thing worth showing beneath it is any answer the
 * artisan typed WITHOUT a recording — those never made it into the video.
 */
export function StoryFilmHero({ outputMediaId, summaryText, story }: StoryFilmHeroProps) {
    const t = useTranslations('craftStory')

    const writtenOnly = ANSWER_KEYS.map((key, i) => ({
        key,
        title: t(`step${i + 1}.title`),
        text: story[`answer${key}Text` as const],
        hasRecording: Boolean(story[`answer${key}MediaId` as const]),
    })).filter(a => !a.hasRecording && a.text?.trim())

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

            {writtenOnly.length > 0 && (
                <details className="mt-6">
                    <summary
                        className="cursor-pointer text-sm font-medium"
                        style={{ color: 'var(--sc-accent)' }}
                    >
                        {t('publicFilm.readFullStory')}
                    </summary>
                    <div className="mt-6 flex flex-col gap-8">
                        {writtenOnly.map(a => (
                            <article key={a.key}>
                                <h3
                                    className="mb-3"
                                    style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '21px', color: 'var(--sc-ink)' }}
                                >
                                    {a.title}
                                </h3>
                                <p className="sc-body whitespace-pre-wrap">{a.text}</p>
                            </article>
                        ))}
                    </div>
                </details>
            )}
        </section>
    )
}
