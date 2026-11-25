'use client'

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Link } from '@/i8n/navigation'
import { useRouter } from '@/i8n/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    Loader2,
    Mic,
    Pencil,
    Sparkles,
    Video,
} from 'lucide-react'
import { useStoryAutosave } from './useStoryAutosave'
import { AnswerMediaUpload } from './AnswerMediaUpload'
import { StoryWorkshopUpload, type WorkshopMedia } from './StoryWorkshopUpload'
import { StoryFilmPanel } from './StoryFilmPanel'
import { StoryFilmUploadButton } from './StoryFilmUploadButton'
import { FilmStoryboard, type StoryboardAnswer } from './FilmStoryboard'
import { ANSWER_KEYS, type AnswerKey, type SceneSettings } from '@/lib/validations/craftStory'
import { mediaKind } from '@/lib/media-kind'
import type { TranscriptSegment } from '@/lib/vtt'

export type CraftStoryDraft = {
    id: string
    status: 'DRAFT' | 'PUBLISHED'
    lastStepReached: number
    sceneSettings?: SceneSettings
    updatedAt: string
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
    summaryText: string | null
    consentedAt: string | null
}

interface CraftStoryWizardProps {
    ownerId: string
    slug: string
    initialStory: CraftStoryDraft | null
    initialWorkshopMedia: WorkshopMedia[]
    // mediaId -> mimeType for saved answer media, so reloaded previews render correctly.
    answerMediaMimeTypes?: Record<string, string>
}

export function CraftStoryWizard({
    ownerId,
    slug,
    initialStory,
    initialWorkshopMedia,
    answerMediaMimeTypes = {},
}: CraftStoryWizardProps) {
    const t = useTranslations('craftStory')
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const draft = useStoryAutosave(ownerId, initialStory, (conflict) =>
        setError(t(conflict ? 'errors.conflict' : 'errors.saveFailed')),
    )
    const { step, story } = draft
    useEffect(() => {
        let active = true
        void fetch('/api/artisans/me/story', { cache: 'no-store' })
            .then(async (res) => {
                if (!res.ok) return
                const { story: fresh } = await res.json()
                if (
                    active &&
                    fresh?.updatedAt !== initialStory?.updatedAt &&
                    draft.server.current.updatedAt === initialStory?.updatedAt
                )
                    router.refresh()
            })
            .catch(() => {})
        return () => {
            active = false
        }
        // Only validate the initial page revision; the save queue owns subsequent writes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ownerId])
    const [publishing, setPublishing] = useState(false)
    const [featureChoice, setFeatureChoice] = useState<string | null>(null)
    const [publishCount, setPublishCount] = useState(0)
    const [consented, setConsented] = useState(Boolean(initialStory?.consentedAt))
    const [returnToReview, setReturnToReview] = useState(false)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [workshop, setWorkshop] = useState(initialWorkshopMedia)
    const [mimes, setMimes] = useState(answerMediaMimeTypes)
    const [statuses, setStatuses] = useState<Record<string, string>>({})
    const [segments, setSegments] = useState<Record<string, TranscriptSegment[]>>({})
    const refresh = useCallback(async () => {
        try {
            const res = await fetch(
                '/api/artisans/me/story/transcripts',
                { cache: 'no-store' },
            )
            if (!res.ok) return
            const data = await res.json()
            setStatuses(data.statuses ?? {})
            setSegments(data.segments ?? {})
        } catch {
            /* Captions don't block a story edit. */
        }
    }, [])
    useEffect(() => {
        void refresh()
    }, [refresh])
    const active = Object.values(statuses).some((s) => s === 'PENDING' || s === 'PROCESSING')
    useEffect(() => {
        if (!active) return
        const timer = setInterval(() => void refresh(), 8000)
        return () => clearInterval(timer)
    }, [refresh, active])
    const answers: StoryboardAnswer[] = ANSWER_KEYS.flatMap((key) => {
        const mediaId = story[`answer${key}MediaId`]
        if (!mediaId) return []
        const kind = mediaKind(mimes[mediaId])
        return kind === 'audio' || kind === 'video' ? [{ key, mediaId, kind }] : []
    })
    const settings = story.sceneSettings ?? {}
    const filmCaptionStatus = { ...statuses }
    for (const { key, mediaId } of answers) {
        if (settings[key]?.caption?.mediaId === mediaId && settings[key]?.caption?.text.trim()) {
            filmCaptionStatus[mediaId] = 'SUPPLIED'
        }
    }
    const [requestingCaptions, setRequestingCaptions] = useState(false)
    const [captionRequestError, setCaptionRequestError] = useState(false)
    async function requestCaptions() {
        const mediaIds = Object.keys(filmCaptionStatus).filter(id =>
            ['AVAILABLE', 'FAILED'].includes(filmCaptionStatus[id]),
        )
        if (!mediaIds.length || requestingCaptions) return
        setRequestingCaptions(true)
        setCaptionRequestError(false)
        try {
            if (!await draft.flush()) return
            const result = await fetch('/api/artisans/me/story/transcripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sendAudioToGroq: true, mediaIds }),
            })
            if (!result.ok) throw new Error('Caption request failed')
            await refresh()
        } catch {
            setCaptionRequestError(true)
        } finally {
            setRequestingCaptions(false)
        }
    }
    const setScene = (key: AnswerKey, value: NonNullable<SceneSettings[AnswerKey]>) =>
        draft.edit({ sceneSettings: { ...settings, [key]: value } })
    const editStep = (n: number) => {
        setReturnToReview(true)
        void draft.go(n)
    }
    const review = () => {
        setReturnToReview(false)
        void draft.go(8).then(() => refresh())
    }
    async function exitEditor() {
        if (await draft.flush()) router.push('/profile')
    }
    async function publish() {
        setPublishing(true)
        setError(null)
        try {
            if (!(await draft.flush())) return
            const res = await fetch('/api/artisans/me/story/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    consent: consented,
                    featureFilmId: featureChoice ?? undefined,
                    expectedUpdatedAt: draft.server.current.updatedAt,
                }),
            })
            const body = await res.json()
            if (!res.ok) {
                setError(
                    t(
                        res.status === 409
                            ? 'errors.conflict'
                            : body.error === 'EMPTY_STORY'
                              ? 'errors.emptyStory'
                              : body.error === 'SELECT_FILM'
                                ? 'studio.chooseFilm'
                                : body.error === 'CONSENT_REQUIRED'
                                  ? 'errors.consentRequired'
                                  : 'errors.publishFailed',
                    ),
                )
                return
            }
            setFeatureChoice(null)
            draft.acceptServer(body.story)
            setPublishCount((n) => n + 1)
        } catch {
            setError(t('errors.publishFailed'))
        } finally {
            setPublishing(false)
        }
    }
    const key = step > 0 && step < 7 ? ANSWER_KEYS[step - 1] : null
    const media = key ? (story[`answer${key}MediaId`] ?? null) : null
    const text = key ? (story[`answer${key}Text`] ?? '') : ''
    const card = (k: AnswerKey, i: number) => {
        const words = story[`answer${k}Text`]
        const id = story[`answer${k}MediaId`]
        const image =
            workshop.find((m) => m.mediaId === settings[k]?.visualId) ??
            workshop[i % Math.max(workshop.length, 1)]
        if (!words && !id && !(i === 0 && image)) return null
        return (
            <figure key={k} className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <figcaption className="text-sm font-semibold text-warm">
                    {t('studio.scenePreview')} · {t(`step${i + 1}.title`)}
                </figcaption>
                {image &&
                    (image.isVideo ? (
                        <video
                            controls
                            playsInline
                            src={image.url}
                            className="max-h-64 w-full rounded-md"
                        />
                    ) : (
                        <img
                            src={image.url}
                            alt={t('studio.firstPhoto')}
                            className="max-h-64 w-full rounded-md object-contain"
                        />
                    ))}
                {words && (
                    <p dir="auto" className="whitespace-pre-line">
                        {words}
                    </p>
                )}
                {id &&
                    (mimes[id]?.startsWith('video/') ? (
                        <video controls playsInline src={'/api/media/' + id} className="w-full" />
                    ) : (
                        <audio
                            controls
                            preload="metadata"
                            aria-label={t(`step${i + 1}.title`)}
                            src={'/api/media/' + id}
                            className="w-full"
                        />
                    ))}
            </figure>
        )
    }
    return (
        <div className="container mx-auto px-4 py-8">
            <Card className="mx-auto max-w-2xl overflow-hidden rounded-2xl">
                <header
                    className="space-y-2 px-6 py-5 text-primary-foreground"
                    style={{ background: 'var(--sc-ink-deep)' }}
                >
                    <button
                        type="button"
                        className="inline-flex items-center gap-1 text-sm underline"
                        onClick={exitEditor}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('saveExit')}
                    </button>
                    <h1 className="text-2xl font-semibold">{t('wizardTitle')}</h1>
                </header>
                <CardContent className="space-y-5 p-5 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm">
                        <strong>{t('studio.draft')}</strong>
                        <span role="status">
                            {draft.state === 'saving'
                                ? t('saving')
                                : draft.state === 'saved'
                                  ? t('studio.saved')
                                  : draft.state === 'error'
                                    ? t('errors.saveFailed')
                                    : ''}
                        </span>
                        {story.status === 'PUBLISHED' && (
                            <Link className="underline" href={'/artisans/' + slug + '#craft-story'}>
                                {t('banner.view')}
                            </Link>
                        )}
                    </div>
                    {publishCount > 0 && step === 8 && (
                        <p role="status" className="rounded-lg bg-warm/10 p-3">
                            {t('studio.live')}
                        </p>
                    )}
                    {step === 0 && (
                        <IntroStep onEnsureStory={draft.flush} onFilmUploaded={review} />
                    )}
                    {step === 1 && !story.status && (
                        <details className="text-sm">
                            <summary className="cursor-pointer">
                                {t('intro.alreadyHaveFilmTitle')}
                            </summary>
                            <StoryFilmUploadButton
                                label={t('film.uploadOwn')}
                                onBeforeUpload={draft.flush}
                                onUploaded={review}
                            />
                        </details>
                    )}
                    {key && (
                        <div className="space-y-5">
                            <QuestionStep
                                index={step}
                                answerKey={key}
                                text={text}
                                mediaId={media}
                                onTextChange={(v) => draft.edit({ [`answer${key}Text`]: v })}
                                onMediaChange={(id, mime) => {
                                    if (id && mime) setMimes((m) => ({ ...m, [id]: mime }))
                                    draft.edit({ [`answer${key}MediaId`]: id })
                                    void draft.flush().then(() => refresh())
                                }}
                                captionStatus={media ? statuses[media] : undefined}
                                filmCaptionSupplied={Boolean(
                                    media && filmCaptionStatus[media] === 'SUPPLIED',
                                )}
                                initialMimeType={media ? mimes[media] : null}
                            />
                            {media && (
                                <details className="rounded-xl border p-4">
                                    <summary className="cursor-pointer text-sm font-medium">
                                        {t('studio.captions')}
                                    </summary>
                                    <label className="mt-3 block text-sm">
                                        {t('studio.captionHint')}
                                        <Textarea
                                            rows={3}
                                            maxLength={5000}
                                            dir="auto"
                                            value={
                                                settings[key]?.caption?.mediaId === media
                                                    ? (settings[key]?.caption?.text ?? '')
                                                    : ''
                                            }
                                            onChange={(e) =>
                                                setScene(key, {
                                                    ...settings[key],
                                                    caption: {
                                                        mediaId: media,
                                                        text: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </label>
                                    {segments[media]?.length > 0 && (
                                        <p className="mt-2 text-sm">
                                            {segments[media].map((s) => s.text).join(' ')}
                                        </p>
                                    )}
                                </details>
                            )}
                            {step === 1 && (
                                <div className="rounded-xl border p-4">
                                    <h2 className="mb-2 font-semibold">{t('studio.firstPhoto')}</h2>
                                    <StoryWorkshopUpload
                                        storyId={story.id ?? null}
                                        ensureStory={async () =>
                                            (await draft.flush())
                                                ? (draft.server.current.id ?? null)
                                                : null
                                        }
                                        items={workshop}
                                        onItemsChange={setWorkshop}
                                    />
                                </div>
                            )}
                            {card(key, step - 1)}
                        </div>
                    )}
                    {step === 7 && (
                        <WorkshopStep
                            storyId={story.id ?? null}
                            items={workshop}
                            onItemsChange={setWorkshop}
                            captionStatuses={statuses}
                            onUploaded={() => void refresh()}
                            storyboardAnswers={answers}
                            settings={settings}
                            onScene={setScene}
                            captionSegments={segments}
                        />
                    )}
                    {step === 8 && (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                aria-expanded={previewOpen}
                                onClick={() => setPreviewOpen(!previewOpen)}
                            >
                                {t('studio.preview')}
                            </Button>
                            {previewOpen && (
                                <div className="space-y-4">
                                    {story.summaryText && <p dir="auto">{story.summaryText}</p>}
                                    {ANSWER_KEYS.map(card)}
                                </div>
                            )}
                            <ReviewStep
                                featureChoice={featureChoice}
                                onFeatureChoice={setFeatureChoice}
                                story={story}
                                refreshFilm={publishCount}
                                beforeRender={draft.flush}
                                workshopCount={workshop.length}
                                captionStatuses={filmCaptionStatus}
                                onEditStep={editStep}
                                summaryText={story.summaryText ?? ''}
                                onSummaryChange={(v) => draft.edit({ summaryText: v })}
                                onPersistSummary={() => void draft.flush()}
                                onFilmUploaded={refresh}
                                onRequestCaptions={requestCaptions}
                                requestingCaptions={requestingCaptions}
                                captionRequestError={captionRequestError}
                                consented={consented}
                                onConsentChange={setConsented}
                            />
                        </>
                    )}
                    {error && (
                        <div role="alert" className="rounded-lg border p-3 text-sm text-red-700">
                            {error}
                            {draft.conflict && (
                                <button
                                    type="button"
                                    className="ms-2 underline"
                                    onClick={draft.discardLocal}
                                >
                                    {t('studio.reload')}
                                </button>
                            )}
                        </div>
                    )}
                    <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                        {step > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={publishing}
                                onClick={() => void draft.go(step - 1)}
                            >
                                {t('back')}
                            </Button>
                        )}
                        {step > 0 && step < 8 && (
                            <Button type="button" variant="outline" onClick={review}>
                                {t('studio.review')}
                            </Button>
                        )}
                        {step === 8 ? (
                            <Button
                                type="button"
                                disabled={!consented || publishing || draft.conflict}
                                onClick={publish}
                            >
                                {publishing
                                    ? t('publishing')
                                    : story.status === 'PUBLISHED'
                                      ? t('studio.publishChanges')
                                      : t('publish')}
                            </Button>
                        ) : (
                            !returnToReview && (
                                <Button type="button" onClick={() => void draft.go(step + 1)}>
                                    {step === 0 ? t('begin') : t('next')}{' '}
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            )
                        )}
                    </footer>
                </CardContent>
            </Card>
        </div>
    )
}

function IntroStep({
    onEnsureStory,
    onFilmUploaded,
}: {
    onEnsureStory: () => Promise<boolean>
    onFilmUploaded: () => void
}) {
    const t = useTranslations('craftStory.intro')
    const tFilm = useTranslations('craftStory.film')
    return (
        <div>
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h2>
            <p className="mb-4 text-base text-muted-foreground">{t('lead')}</p>
            <div className="mb-4 rounded-lg bg-muted/50 p-4">
                <p className="mb-2 text-sm font-medium">{t('formatsTitle')}</p>
                <ul className="ms-5 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>{t('formatText')}</li>
                    <li>{t('formatAudio')}</li>
                    <li>{t('formatVideo')}</li>
                </ul>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">{t('encouragement')}</p>

            {/* The alternative to the whole wizard, offered before the artisan
                starts rather than after they have answered everything. */}
            <div className="rounded-lg border border-border p-4">
                <p className="mb-1 text-sm font-medium">{t('alreadyHaveFilmTitle')}</p>
                <p className="mb-3 text-sm text-muted-foreground">{t('alreadyHaveFilmBody')}</p>
                <StoryFilmUploadButton
                    label={tFilm('uploadOwn')}
                    onBeforeUpload={onEnsureStory}
                    onUploaded={onFilmUploaded}
                />
            </div>
        </div>
    )
}

function QuestionStep({
    index,
    answerKey,
    text,
    mediaId,
    onTextChange,
    onMediaChange,
    filmCaptionSupplied,
    captionStatus,
    initialMimeType,
}: {
    index: number
    answerKey: AnswerKey
    text: string
    mediaId: string | null
    onTextChange: (value: string) => void
    onMediaChange: (id: string | null, mimeType?: string | null) => void
    captionStatus?: string
    filmCaptionSupplied: boolean
    initialMimeType?: string | null
}) {
    const t = useTranslations('craftStory')
    return (
        <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warm">
                {t('questionLabel', { index })}
            </p>
            <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {t(`step${index}.title`)}
            </h2>
            <p className="mb-6 text-base text-muted-foreground">{t(`step${index}.prompt`)}</p>

            <div className="space-y-4">
                {/* Primary: the recording is what plays in the film. */}
                <div className="rounded-xl border border-warm/30 bg-warm/5 p-4">
                    <div className="mb-1 flex items-center gap-2">
                        <Mic className="h-4 w-4 text-warm" />
                        <Video className="h-4 w-4 text-warm" />
                        <span className="text-sm font-semibold text-warm">
                            {t('answerRecordTitle')}
                        </span>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">{t('answerRecordHint')}</p>
                    <AnswerMediaUpload
                        mediaId={mediaId}
                        onChange={onMediaChange}
                        initialMimeType={initialMimeType}
                        captionsReady={captionStatus === 'READY'}
                    />
                    {mediaId && (
                        <div className="mt-2">
                            {filmCaptionSupplied ? (
                                <p className="text-xs font-medium text-warm">
                                    {t('studio.supplied')}
                                </p>
                            ) : (
                                <CaptionStatusChip status={captionStatus} />
                            )}
                        </div>
                    )}
                </div>

                {/* Clear either/or between recording and writing. */}
                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('answerOr')}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                {/* Secondary: a written answer, not used in the film. */}
                <div>
                    <Label
                        htmlFor={`answer-${answerKey}`}
                        className="mb-1 block text-sm font-medium"
                    >
                        {t('writeYourAnswer')}
                    </Label>
                    <p className="mb-1.5 text-xs text-muted-foreground">{t('answerWriteHint')}</p>
                    <Textarea
                        id={`answer-${answerKey}`}
                        value={text}
                        onChange={(e) => onTextChange(e.target.value)}
                        placeholder={t('answerPlaceholder')}
                        maxLength={5000}
                        rows={5}
                    />
                </div>
            </div>
        </div>
    )
}

// Caption pipeline feedback — without it a FAILED transcription would be
// invisible to the artisan (there is no editing step to surface it).
function CaptionStatusChip({ status }: { status?: string }) {
    const t = useTranslations('craftStory.captions')
    if (!status || status === 'AVAILABLE') return null
    if (status === 'READY') {
        return (
            <p className="flex items-center gap-1.5 text-xs font-medium text-warm">
                <Check className="h-3.5 w-3.5" />
                {t('ready')}
            </p>
        )
    }
    if (status === 'FAILED') {
        return (
            <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {t('failed')}
            </p>
        )
    }
    return (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('processing')}
        </p>
    )
}

function WorkshopStep({
    storyId,
    items,
    onItemsChange,
    captionStatuses,
    onUploaded,
    storyboardAnswers,
    settings,
    onScene,
    captionSegments,
}: {
    storyId: string | null
    items: WorkshopMedia[]
    onItemsChange: Dispatch<SetStateAction<WorkshopMedia[]>>
    captionStatuses: Record<string, string>
    onUploaded: () => void
    storyboardAnswers: StoryboardAnswer[]
    settings: SceneSettings
    onScene: (key: AnswerKey, value: NonNullable<SceneSettings[AnswerKey]>) => void
    captionSegments: Record<string, TranscriptSegment[]>
}) {
    const t = useTranslations('craftStory.step7')
    return (
        <div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h2>
            <p className="mb-6 text-base text-muted-foreground">{t('prompt')}</p>
            {storyId ? (
                <>
                    <StoryWorkshopUpload
                        storyId={storyId}
                        items={items}
                        onItemsChange={onItemsChange}
                        captionStatuses={captionStatuses}
                        onUploaded={onUploaded}
                    />
                    {/* Sits directly under the grid so a reorder and its effect
                        on the film are visible in one glance. */}
                    <FilmStoryboard
                        answers={storyboardAnswers}
                        settings={settings}
                        onScene={onScene}
                        workshopMedia={items}
                        segments={captionSegments}
                    />
                </>
            ) : (
                <p className="text-sm text-muted-foreground">{t('saveFirst')}</p>
            )}
        </div>
    )
}

function ReviewStep({
    story,
    refreshFilm,
    beforeRender,
    featureChoice,
    onFeatureChoice,
    workshopCount,
    captionStatuses,
    onEditStep,
    summaryText,
    onSummaryChange,
    onPersistSummary,
    onFilmUploaded,
    onRequestCaptions,
    requestingCaptions,
    captionRequestError,
    consented,
    onConsentChange,
}: {
    story: Partial<CraftStoryDraft>
    refreshFilm: number
    featureChoice: string | null
    onFeatureChoice: (id: string | null) => void
    beforeRender: () => Promise<boolean>
    workshopCount: number
    captionStatuses: Record<string, string>
    onEditStep: (step: number) => void
    summaryText: string
    onSummaryChange: (value: string) => void
    onPersistSummary: () => void
    onFilmUploaded: () => Promise<void>
    onRequestCaptions: () => void
    requestingCaptions: boolean
    captionRequestError: boolean
    consented: boolean
    onConsentChange: (value: boolean) => void
}) {
    const t = useTranslations('craftStory')
    const statusValues = Object.values(captionStatuses)
    const captionsProcessing = statusValues.some((s) => s === 'PENDING' || s === 'PROCESSING')
    const captionsFailed = statusValues.some((s) => s === 'FAILED')
    const rows = ANSWER_KEYS.map((key, i) => {
        const text = story[`answer${key}Text` as const] as string | null | undefined
        const media = story[`answer${key}MediaId` as const] as string | null | undefined
        const summary = [
            text?.trim()
                ? `${(text as string).slice(0, 80)}${(text as string).length > 80 ? '…' : ''}`
                : null,
            media ? t('review.hasRecording') : null,
        ]
            .filter(Boolean)
            .join(' · ')
        return {
            // Questions occupy steps 1-6, in the same order as ANSWER_KEYS.
            step: i + 1,
            label: t(`step${i + 1}.title`),
            value: summary || null,
        }
    })

    // Workshop media is its own step (7); add it as a final editable row.
    const allRows = [
        ...rows,
        {
            step: 7,
            label: t('step7.title'),
            value: t('review.workshopCount', { count: workshopCount }),
        },
    ]

    return (
        <div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {t('review.title')}
            </h2>
            <p className="mb-6 text-base text-muted-foreground">{t('review.lead')}</p>

            {/* The film is the headline of the story — offer it first. */}
            <StoryFilmPanel
                featureChoice={featureChoice}
                onFeatureChoice={onFeatureChoice}
                key={refreshFilm}
                onUploaded={onFilmUploaded}
                beforeRender={beforeRender}
                storyPublished={story.status === 'PUBLISHED'}
            />

            <div className="mt-6">
                <SummaryEditor
                    value={summaryText}
                    onChange={onSummaryChange}
                    onPersist={onPersistSummary}
                />
            </div>

            <div className="mt-8 divide-y divide-border overflow-hidden rounded-lg border border-border">
                {allRows.map(({ step, label, value }) => (
                    <button
                        key={label}
                        type="button"
                        onClick={() => onEditStep(step)}
                        aria-label={t('review.editStep', { section: label })}
                        className="group flex w-full flex-col gap-1 px-4 py-3 text-start transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:flex-row sm:items-start sm:justify-between"
                    >
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:w-1/3">
                            {label}
                        </span>
                        <span className="flex items-start gap-2 sm:w-2/3">
                            <span
                                className={`text-sm ${value ? 'font-medium' : 'italic text-muted-foreground'}`}
                            >
                                {value ?? t('review.notAnswered')}
                            </span>
                            <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                        </span>
                    </button>
                ))}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">{t('review.editHint')}</p>
            {(statusValues.includes('AVAILABLE') || captionsFailed) && (
                <div className="mt-4 space-y-2">
                    <p className="text-sm">{t('captions.disclosure')}</p>
                    <Button type="button" variant="outline" onClick={onRequestCaptions} disabled={requestingCaptions}>
                        {t('captions.request')}
                    </Button>
                </div>
            )}
            {captionRequestError && <p role="alert">{t('captions.requestError')}</p>}
            {captionsProcessing && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('captions.someProcessing')}
                </p>
            )}
            {captionsFailed && (
                <div className="mt-3 flex flex-col items-center gap-1.5">
                    <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {t('captions.someFailed')}
                    </p>
                </div>
            )}

            {/* Publishing puts the artisan's face, voice and chosen location in
                public, so it is confirmed explicitly rather than implied by the
                Publish button. */}
            <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
                <h2 className="mb-2 text-sm font-semibold">{t('consent.title')}</h2>
                <label className="flex items-start gap-3 text-sm">
                    <input
                        type="checkbox"
                        checked={consented}
                        onChange={(e) => onConsentChange(e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--sc-accent)]"
                    />
                    <span className="leading-snug text-muted-foreground">{t('consent.body')}</span>
                </label>
            </div>
        </div>
    )
}

// A short editable summary of the whole story. "Suggest" drafts one from the
// artisan's answers + transcripts via the server; the artisan owns the final text.
function SummaryEditor({
    value,
    onChange,
    onPersist,
}: {
    value: string
    onChange: (value: string) => void
    onPersist: () => void
}) {
    const t = useTranslations('craftStory.summary')
    const [drafting, setDrafting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function suggest() {
        setDrafting(true)
        setError(null)
        try {
            const res = await fetch('/api/artisans/me/story/summary/draft', { method: 'POST' })
            if (res.status === 429) return setError(t('rateLimited'))
            if (res.status === 400) return setError(t('empty'))
            if (!res.ok) return setError(t('failed'))
            const data = await res.json()
            if (data.draft) {
                onChange(data.draft)
                onPersist()
            }
        } catch {
            setError(t('failed'))
        } finally {
            setDrafting(false)
        }
    }

    return (
        <div className="mt-6 rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
                <Label htmlFor="story-summary" className="text-sm font-medium">
                    {t('label')}
                </Label>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void suggest()}
                    disabled={drafting}
                >
                    {drafting ? (
                        <>
                            <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                            {t('suggesting')}
                        </>
                    ) : (
                        <>
                            <Sparkles className="me-1.5 h-4 w-4" />
                            {t('suggest')}
                        </>
                    )}
                </Button>
            </div>
            <p className="mb-2 text-sm text-muted-foreground">{t('providerNotice')}</p>
            <Textarea
                id="story-summary"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onPersist}
                placeholder={t('hint')}
                rows={4}
                maxLength={1200}
            />
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    )
}
