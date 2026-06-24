import { useTranslations } from 'next-intl'
import { ANSWER_KEYS } from '@/lib/validations/craftStory'

export interface PublishedCraftStory {
    answerSelfText: string | null
    answerSelfMediaId: string | null
    answerCraftText: string | null
    answerCraftMediaId: string | null
    answerMeaningText: string | null
    answerMeaningMediaId: string | null
    answerBenefitsText: string | null
    answerBenefitsMediaId: string | null
    answerFutureText: string | null
    answerFutureMediaId: string | null
    answerChallengesText: string | null
    answerChallengesMediaId: string | null
}

export interface WorkshopMediaItem {
    mediaId: string
    isVideo: boolean
}

interface CraftStoryDisplayProps {
    story: PublishedCraftStory
    workshop: WorkshopMediaItem[]
    answerMediaMimeTypes: Record<string, string>
}

export function CraftStoryDisplay({ story, workshop, answerMediaMimeTypes }: CraftStoryDisplayProps) {
    const t = useTranslations('craftStory')

    const hasAny =
        ANSWER_KEYS.some(k => {
            const text = story[`answer${k}Text` as const]
            const media = story[`answer${k}MediaId` as const]
            return (text && text.trim().length > 0) || media
        }) || workshop.length > 0

    if (!hasAny) return null

    return (
        <section id="craft-story" className="scroll-mt-24">
            <p className="sc-eyebrow mb-2">{t('publicHeading')}</p>
            <h2 className="sc-h2 mb-8">{t('publicTitle')}</h2>

            <div className="flex flex-col gap-10">
                {ANSWER_KEYS.map((key, i) => {
                    const text = story[`answer${key}Text` as const]
                    const mediaId = story[`answer${key}MediaId` as const]
                    if (!text?.trim() && !mediaId) return null
                    const isVideo = mediaId
                        ? (answerMediaMimeTypes[mediaId] ?? '').startsWith('video/')
                        : false
                    return (
                        <article key={key}>
                            <h3
                                className="mb-3"
                                style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '21px', color: 'var(--sc-ink)' }}
                            >
                                {t(`step${i + 1}.title`)}
                            </h3>
                            {text?.trim() && (
                                <p className="sc-body mb-4 whitespace-pre-wrap">
                                    {text}
                                </p>
                            )}
                            {mediaId && (
                                <div
                                    className="rounded-[var(--sc-r-card)] p-2"
                                    style={{ border: '1px solid var(--sc-border)', background: 'var(--sc-surface-trans)' }}
                                >
                                    {isVideo ? (
                                        <video
                                            src={`/api/media/${mediaId}`}
                                            controls
                                            className="w-full rounded-[var(--sc-r-btn)]"
                                        />
                                    ) : (
                                        <audio
                                            src={`/api/media/${mediaId}`}
                                            controls
                                            className="w-full"
                                        />
                                    )}
                                </div>
                            )}
                        </article>
                    )
                })}

                {workshop.length > 0 && (
                    <article>
                        <h3
                            className="mb-3"
                            style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '21px', color: 'var(--sc-ink)' }}
                        >
                            {t('step7.title')}
                        </h3>
                        <div className="grid grid-cols-2 gap-[var(--sc-grid-gap)] sm:grid-cols-3">
                            {workshop.map(item => (
                                <div
                                    key={item.mediaId}
                                    className="overflow-hidden rounded-[var(--sc-r-card)]"
                                    style={{ border: '1px solid var(--sc-border)', background: 'var(--sc-surface-trans)', boxShadow: 'var(--sc-shadow-card)' }}
                                >
                                    {item.isVideo ? (
                                        <video
                                            src={`/api/media/${item.mediaId}`}
                                            controls
                                            className="aspect-square w-full object-cover"
                                        />
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={`/api/media/${item.mediaId}`}
                                            alt=""
                                            className="aspect-square w-full object-cover"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </article>
                )}
            </div>
        </section>
    )
}
