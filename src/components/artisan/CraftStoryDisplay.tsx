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
        <section id="craft-story" className="border-t border-border/50 bg-background py-12 scroll-mt-24">
            <div className="mx-auto max-w-3xl px-4">
                <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-warm">
                    {t('publicHeading')}
                </h2>
                <p className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">
                    {t('publicTitle')}
                </p>

                <div className="space-y-10">
                    {ANSWER_KEYS.map((key, i) => {
                        const text = story[`answer${key}Text` as const]
                        const mediaId = story[`answer${key}MediaId` as const]
                        if (!text?.trim() && !mediaId) return null
                        const isVideo = mediaId
                            ? (answerMediaMimeTypes[mediaId] ?? '').startsWith('video/')
                            : false
                        return (
                            <article key={key}>
                                <h3 className="mb-3 text-lg font-semibold tracking-tight">
                                    {t(`step${i + 1}.title`)}
                                </h3>
                                {text?.trim() && (
                                    <p className="mb-4 whitespace-pre-wrap text-base leading-relaxed text-foreground/85">
                                        {text}
                                    </p>
                                )}
                                {mediaId && (
                                    <div className="rounded-lg border border-border bg-muted/30 p-2">
                                        {isVideo ? (
                                            <video
                                                src={`/api/media/${mediaId}`}
                                                controls
                                                className="w-full rounded-md"
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
                            <h3 className="mb-3 text-lg font-semibold tracking-tight">
                                {t('step7.title')}
                            </h3>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {workshop.map(item => (
                                    <div
                                        key={item.mediaId}
                                        className="overflow-hidden rounded-lg border border-border bg-muted/30"
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
            </div>
        </section>
    )
}
