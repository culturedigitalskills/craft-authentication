'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Container } from '@/components/layout/Container'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Check, Loader2, Save } from 'lucide-react'
import { AnswerMediaUpload } from './AnswerMediaUpload'
import { StoryWorkshopUpload, type WorkshopMedia } from './StoryWorkshopUpload'
import { ANSWER_KEYS, type AnswerKey } from '@/lib/validations/craftStory'

export type CraftStoryDraft = {
    id: string
    status: 'DRAFT' | 'PUBLISHED'
    lastStepReached: number
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
}

interface CraftStoryWizardProps {
    initialStory: CraftStoryDraft | null
    initialWorkshopMedia: WorkshopMedia[]
    maxUploadMb: number
}

// 0=intro, 1-6=questions, 7=workshop media, 8=review
const TOTAL_STEPS = 9

export function CraftStoryWizard({ initialStory, initialWorkshopMedia, maxUploadMb }: CraftStoryWizardProps) {
    const t = useTranslations('craftStory')
    const router = useRouter()

    const [step, setStep] = useState(initialStory?.lastStepReached ?? 0)
    const [story, setStory] = useState<Partial<CraftStoryDraft>>(initialStory ?? {})
    const [storyId, setStoryId] = useState<string | null>(initialStory?.id ?? null)
    const [knownUpdatedAt, setKnownUpdatedAt] = useState<string | null>(initialStory?.updatedAt ?? null)
    const [saving, setSaving] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function setAnswerText(key: AnswerKey, value: string) {
        setStory(s => ({ ...s, [`answer${key}Text`]: value }))
    }
    function setAnswerMedia(key: AnswerKey, mediaId: string | null) {
        setStory(s => ({ ...s, [`answer${key}MediaId`]: mediaId }))
    }

    async function save(nextStep: number): Promise<boolean> {
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/artisans/me/story', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lastStepReached: Math.max(nextStep, story.lastStepReached ?? 0),
                    expectedUpdatedAt: knownUpdatedAt ?? undefined,
                    answerSelfText: story.answerSelfText ?? null,
                    answerSelfMediaId: story.answerSelfMediaId ?? null,
                    answerCraftText: story.answerCraftText ?? null,
                    answerCraftMediaId: story.answerCraftMediaId ?? null,
                    answerMeaningText: story.answerMeaningText ?? null,
                    answerMeaningMediaId: story.answerMeaningMediaId ?? null,
                    answerBenefitsText: story.answerBenefitsText ?? null,
                    answerBenefitsMediaId: story.answerBenefitsMediaId ?? null,
                    answerFutureText: story.answerFutureText ?? null,
                    answerFutureMediaId: story.answerFutureMediaId ?? null,
                    answerChallengesText: story.answerChallengesText ?? null,
                    answerChallengesMediaId: story.answerChallengesMediaId ?? null,
                }),
            })
            if (res.status === 409) {
                setError(t('errors.conflict'))
                return false
            }
            if (!res.ok) throw new Error('Save failed')
            const data = await res.json()
            if (data.story?.id) setStoryId(data.story.id)
            if (data.story?.updatedAt) setKnownUpdatedAt(data.story.updatedAt)
            setStory(s => ({ ...s, ...data.story }))
            return true
        } catch {
            setError(t('errors.saveFailed'))
            return false
        } finally {
            setSaving(false)
        }
    }

    async function handleNext() {
        const target = step + 1
        const ok = await save(target)
        if (ok) setStep(target)
    }

    function handleBack() {
        setStep(s => Math.max(0, s - 1))
    }

    async function handleSaveExit() {
        await save(step)
        router.push('/profile')
    }

    async function handlePublish() {
        setPublishing(true)
        setError(null)
        try {
            // Persist final state, then publish
            const saved = await save(step)
            if (!saved) {
                setPublishing(false)
                return
            }
            const res = await fetch('/api/artisans/me/story/publish', { method: 'POST' })
            if (!res.ok) {
                let body: { error?: string; message?: string } | null = null
                try { body = await res.json() } catch { /* ignore */ }
                if (body?.error === 'EMPTY_STORY') {
                    setError(t('errors.emptyStory'))
                } else {
                    setError(t('errors.publishFailed'))
                }
                return
            }
            router.push('/profile')
        } catch {
            setError(t('errors.publishFailed'))
        } finally {
            setPublishing(false)
        }
    }

    const isQuestion = step >= 1 && step <= 6
    const currentKey = isQuestion ? ANSWER_KEYS[step - 1] : null

    return (
        <Container>
            <div className="mx-auto max-w-2xl py-10 sm:py-14">
                {/* Progress dots */}
                <div className="mb-2 flex justify-center gap-2">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => i).map(n => (
                        <span
                            key={n}
                            className={`h-2 w-2 rounded-full transition-all ${
                                n === step
                                    ? 'w-8 bg-primary'
                                    : n < step
                                      ? 'bg-primary/40'
                                      : 'bg-muted'
                            }`}
                        />
                    ))}
                </div>
                <p className="mb-8 text-center text-xs text-muted-foreground">
                    {t('stepLabel', { current: step + 1, total: TOTAL_STEPS })}
                </p>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <div key={step} className="animate-in fade-in-50 slide-in-from-right-4 duration-300">
                        {step === 0 && <IntroStep />}

                        {isQuestion && currentKey && (
                            <QuestionStep
                                index={step}
                                answerKey={currentKey}
                                text={(story[`answer${currentKey}Text` as const] as string | null | undefined) ?? ''}
                                mediaId={(story[`answer${currentKey}MediaId` as const] as string | null | undefined) ?? null}
                                onTextChange={v => setAnswerText(currentKey, v)}
                                onMediaChange={id => setAnswerMedia(currentKey, id)}
                                maxUploadMb={maxUploadMb}
                            />
                        )}

                        {step === 7 && (
                            <WorkshopStep storyId={storyId} initial={initialWorkshopMedia} maxUploadMb={maxUploadMb} />
                        )}

                        {step === 8 && (
                            <ReviewStep story={story} workshopCount={initialWorkshopMedia.length} />
                        )}

                        {error && (
                            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-between gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        disabled={step === 0 || saving || publishing}
                    >
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        {t('back')}
                    </Button>

                    <div className="flex items-center gap-2">
                        {step > 0 && step < TOTAL_STEPS - 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleSaveExit}
                                disabled={saving || publishing}
                            >
                                <Save className="mr-1.5 h-4 w-4" />
                                {t('saveExit')}
                            </Button>
                        )}
                        {step < TOTAL_STEPS - 1 ? (
                            <Button type="button" onClick={handleNext} disabled={saving || publishing}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        {t('saving')}
                                    </>
                                ) : (
                                    <>
                                        {step === 0 ? t('begin') : t('next')}
                                        <ArrowRight className="ml-1.5 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button type="button" onClick={handlePublish} disabled={saving || publishing}>
                                {publishing ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        {t('publishing')}
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-1.5 h-4 w-4" />
                                        {t('publish')}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Container>
    )
}

function IntroStep() {
    const t = useTranslations('craftStory.intro')
    return (
        <div>
            <h1 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
            <p className="mb-4 text-base text-muted-foreground">{t('lead')}</p>
            <div className="mb-4 rounded-lg bg-muted/50 p-4">
                <p className="mb-2 text-sm font-medium">{t('formatsTitle')}</p>
                <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>{t('formatText')}</li>
                    <li>{t('formatAudio')}</li>
                    <li>{t('formatVideo')}</li>
                </ul>
            </div>
            <p className="text-sm text-muted-foreground">{t('encouragement')}</p>
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
    maxUploadMb,
}: {
    index: number
    answerKey: AnswerKey
    text: string
    mediaId: string | null
    onTextChange: (value: string) => void
    onMediaChange: (id: string | null) => void
    maxUploadMb: number
}) {
    const t = useTranslations('craftStory')
    return (
        <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warm">
                {t('questionLabel', { index })}
            </p>
            <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {t(`step${index}.title`)}
            </h1>
            <p className="mb-6 text-base text-muted-foreground">{t(`step${index}.prompt`)}</p>

            <div className="space-y-4">
                <div>
                    <Label htmlFor={`answer-${answerKey}`} className="mb-1.5 block text-sm font-medium">
                        {t('writeYourAnswer')}
                    </Label>
                    <Textarea
                        id={`answer-${answerKey}`}
                        value={text}
                        onChange={e => onTextChange(e.target.value)}
                        placeholder={t('answerPlaceholder')}
                        rows={6}
                    />
                </div>
                <AnswerMediaUpload mediaId={mediaId} onChange={onMediaChange} maxUploadMb={maxUploadMb} />
            </div>
        </div>
    )
}

function WorkshopStep({ storyId, initial, maxUploadMb }: { storyId: string | null; initial: WorkshopMedia[]; maxUploadMb: number }) {
    const t = useTranslations('craftStory.step7')
    return (
        <div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
            <p className="mb-6 text-base text-muted-foreground">{t('prompt')}</p>
            {storyId ? (
                <StoryWorkshopUpload storyId={storyId} initialItems={initial} maxUploadMb={maxUploadMb} />
            ) : (
                <p className="text-sm text-muted-foreground">{t('saveFirst')}</p>
            )}
        </div>
    )
}

function ReviewStep({ story, workshopCount }: { story: Partial<CraftStoryDraft>; workshopCount: number }) {
    const t = useTranslations('craftStory')
    const rows = ANSWER_KEYS.map((key, i) => {
        const text = story[`answer${key}Text` as const] as string | null | undefined
        const media = story[`answer${key}MediaId` as const] as string | null | undefined
        const summary = [
            text?.trim() ? `${(text as string).slice(0, 80)}${(text as string).length > 80 ? '…' : ''}` : null,
            media ? t('review.hasRecording') : null,
        ].filter(Boolean).join(' · ')
        return {
            label: t(`step${i + 1}.title`),
            value: summary || null,
        }
    })

    return (
        <div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{t('review.title')}</h1>
            <p className="mb-6 text-base text-muted-foreground">{t('review.lead')}</p>
            <div className="divide-y divide-border rounded-lg border border-border">
                {rows.map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:w-1/3">{label}</span>
                        <span className={`text-sm sm:w-2/3 ${value ? 'font-medium' : 'italic text-muted-foreground'}`}>
                            {value ?? t('review.notAnswered')}
                        </span>
                    </div>
                ))}
                <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:w-1/3">
                        {t('step7.title')}
                    </span>
                    <span className="text-sm sm:w-2/3">
                        {t('review.workshopCount', { count: workshopCount })}
                    </span>
                </div>
            </div>
        </div>
    )
}
