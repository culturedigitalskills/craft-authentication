'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Container } from '@/components/layout/Container'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ProfilePhotoUpload } from '@/components/profile/ProfilePhotoUpload'
import { CoverPhotoUpload } from '@/components/profile/CoverPhotoUpload'
import { LocationSelect } from '@/components/profile/LocationSelect'
import { ArrowLeft, ArrowRight, Globe, Hash, X, Loader2, Check } from 'lucide-react'
import { FaInstagram, FaFacebook, FaXTwitter, FaYoutube, FaTiktok } from 'react-icons/fa6'
import { parseApiError } from '@/lib/api-error'
import { normalizeWebsite } from '@/lib/validations/artisan'

type WizardData = {
    firstName: string
    lastName: string
    photoMediaId: string | null
    coverMediaId: string | null
    bio: string
    yearsOfExperience: string
    learningSource: string
    country: string | null
    region: string | null
    socialInstagram: string
    socialFacebook: string
    socialTwitter: string
    socialTiktok: string
    socialYoutube: string
    website: string
    hashtags: string[]
}

const INITIAL_DATA: WizardData = {
    firstName: '',
    lastName: '',
    photoMediaId: null,
    coverMediaId: null,
    bio: '',
    yearsOfExperience: '',
    learningSource: '',
    country: null,
    region: null,
    socialInstagram: '',
    socialFacebook: '',
    socialTwitter: '',
    socialTiktok: '',
    socialYoutube: '',
    website: '',
    hashtags: [],
}

const TOTAL_STEPS = 6

// Which wizard step each server-validated field lives on, so a validation
// error can send the user back to the right screen.
const FIELD_STEPS: Record<string, number> = {
    firstName: 1,
    lastName: 1,
    bio: 3,
    yearsOfExperience: 3,
    learningSource: 3,
    country: 4,
    region: 4,
    socialInstagram: 5,
    socialFacebook: 5,
    socialTwitter: 5,
    socialTiktok: 5,
    socialYoutube: 5,
    website: 5,
    hashtags: 5,
}

const SOCIAL_KEYS = [
    'socialInstagram',
    'socialFacebook',
    'socialTwitter',
    'socialTiktok',
    'socialYoutube',
] as const

export function ArtisanOnboardingWizard() {
    const t = useTranslations('onboardingWizard')
    const tp = useTranslations('profile')
    const router = useRouter()

    const [step, setStep] = useState(1)
    const [data, setData] = useState<WizardData>(INITIAL_DATA)
    const [hashtagInput, setHashtagInput] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    const update = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
        setData((d) => ({ ...d, [key]: value }))
        setFieldErrors((fe) => {
            if (!(key in fe)) return fe
            const next = { ...fe }
            delete next[key]
            return next
        })
    }

    function showFieldErrors(errors: Record<string, string>) {
        setFieldErrors(errors)
        setError(t('fixFieldsError'))
        setStep(Math.min(...Object.keys(errors).map((k) => FIELD_STEPS[k] ?? TOTAL_STEPS)))
        setSubmitting(false)
    }

    const nameValid = /\D/.test(data.firstName.trim()) && /\D/.test(data.lastName.trim())

    function next() {
        if (step < TOTAL_STEPS) setStep((s) => s + 1)
    }

    function back() {
        if (step > 1) setStep((s) => s - 1)
    }

    function addHashtag() {
        const tag = hashtagInput.replace(/^#/, '').trim()
        if (
            tag &&
            /^[A-Za-z0-9_]{1,50}$/.test(tag) &&
            !data.hashtags.includes(tag) &&
            data.hashtags.length < 20
        ) {
            update('hashtags', [...data.hashtags, tag])
        }
        setHashtagInput('')
    }

    async function handleSubmit() {
        setSubmitting(true)
        setError(null)
        setFieldErrors({})

        // Validate client-side the fields the server is strict about, so the
        // user gets a field-level message instead of an opaque failure.
        const clientErrors: Record<string, string> = {}
        const website = normalizeWebsite(data.website)
        if (website) {
            try {
                new URL(website)
            } catch {
                clientErrors.website = t('invalidWebsite')
            }
        }
        for (const key of SOCIAL_KEYS) {
            if (data[key].trim().length > 100) clientErrors[key] = t('handleTooLong')
        }
        if (Object.keys(clientErrors).length > 0) {
            showFieldErrors(clientErrors)
            return
        }

        const body: Record<string, unknown> = {
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
        }
        if (data.bio) body.bio = data.bio
        if (data.yearsOfExperience) body.yearsOfExperience = parseInt(data.yearsOfExperience, 10)
        if (data.learningSource) body.learningSource = data.learningSource
        if (data.country) body.country = data.country
        if (data.region) body.region = data.region
        for (const key of SOCIAL_KEYS) {
            const handle = data[key].trim().replace(/^@/, '')
            if (handle) body[key] = handle
        }
        if (website) body.website = website
        body.hashtags = data.hashtags

        try {
            const res = await fetch('/api/artisans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            let artisan: { id: string; slug: string }
            if (res.ok) {
                artisan = await res.json()
            } else if (res.status === 409) {
                // Profile already exists — e.g. a previous attempt created it but
                // a follow-up step failed. Resume with the existing profile
                // instead of dead-ending on the error.
                const meRes = await fetch('/api/artisans/me')
                const me = meRes.ok ? await meRes.json() : null
                if (!me?.artisan) throw new Error('Create failed')
                artisan = me.artisan
            } else if (res.status === 400) {
                const { issues } = await parseApiError(res)
                const mapped: Record<string, string> = {}
                for (const issue of issues) {
                    const field = issue.path.split('.')[0]
                    if (!mapped[field]) mapped[field] = issue.message
                }
                if (Object.keys(mapped).length > 0) {
                    showFieldErrors(mapped)
                } else {
                    setError(t('createFailed'))
                    setSubmitting(false)
                }
                return
            } else {
                const { error: serverError } = await parseApiError(res)
                setError(serverError || t('createFailed'))
                setSubmitting(false)
                return
            }

            const attachments: Promise<Response>[] = []
            if (data.photoMediaId) {
                attachments.push(
                    fetch('/api/media/attachments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mediaId: data.photoMediaId,
                            entityType: 'Artisan',
                            entityId: artisan.id,
                            attachmentType: 'HERO',
                            isPrimary: true,
                        }),
                    }),
                )
            }
            if (data.coverMediaId) {
                attachments.push(
                    fetch('/api/media/attachments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mediaId: data.coverMediaId,
                            entityType: 'Artisan',
                            entityId: artisan.id,
                            attachmentType: 'COVER',
                            isPrimary: true,
                        }),
                    }),
                )
            }
            // Attachment failures are non-fatal — the profile exists and photos
            // can be re-uploaded from the profile page.
            if (attachments.length > 0) await Promise.allSettled(attachments)

            router.push(`/artisans/${artisan.slug}`)
        } catch {
            setError(t('createFailed'))
            setSubmitting(false)
        }
    }

    return (
        <Container>
            <div className="mx-auto max-w-2xl py-10 sm:py-14">
                {/* Progress dots */}
                <div className="mb-2 flex justify-center gap-2">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
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
                    {t('stepLabel', { current: step, total: TOTAL_STEPS })}
                </p>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <div
                        key={step}
                        className="animate-in fade-in-50 slide-in-from-right-4 duration-300"
                    >
                        <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
                            {t(`step${step}Title`)}
                        </h1>
                        <p className="mb-6 text-sm text-muted-foreground">{t(`step${step}Hint`)}</p>

                        {step === 1 && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label
                                        htmlFor="firstName"
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        {tp('firstName')}
                                    </Label>
                                    <Input
                                        id="firstName"
                                        value={data.firstName}
                                        onChange={(e) => update('firstName', e.target.value)}
                                        pattern=".*\D.*"
                                        aria-invalid={!!fieldErrors.firstName || undefined}
                                        autoFocus
                                        required
                                    />
                                    {fieldErrors.firstName && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                            {fieldErrors.firstName}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label
                                        htmlFor="lastName"
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        {tp('lastName')}
                                    </Label>
                                    <Input
                                        id="lastName"
                                        value={data.lastName}
                                        onChange={(e) => update('lastName', e.target.value)}
                                        pattern=".*\D.*"
                                        aria-invalid={!!fieldErrors.lastName || undefined}
                                        required
                                    />
                                    {fieldErrors.lastName && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                            {fieldErrors.lastName}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-5">
                                <CoverPhotoUpload
                                    artisanId={null}
                                    currentCoverUrl={
                                        data.coverMediaId ? `/api/media/${data.coverMediaId}` : null
                                    }
                                    onCoverUploaded={(id) => update('coverMediaId', id)}
                                />
                                <div className="flex justify-center">
                                    <ProfilePhotoUpload
                                        artisanId={null}
                                        currentPhotoUrl={
                                            data.photoMediaId
                                                ? `/api/media/${data.photoMediaId}`
                                                : null
                                        }
                                        onPhotoUploaded={(id) => update('photoMediaId', id)}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4">
                                <div>
                                    <Label
                                        htmlFor="bio"
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        {tp('bio')}
                                    </Label>
                                    <Textarea
                                        id="bio"
                                        value={data.bio}
                                        onChange={(e) => update('bio', e.target.value)}
                                        placeholder={tp('bioPlaceholder')}
                                        rows={4}
                                    />
                                </div>
                                <div>
                                    <Label
                                        htmlFor="yearsOfExperience"
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        {tp('yearsOfExperience')}
                                    </Label>
                                    <Input
                                        id="yearsOfExperience"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={data.yearsOfExperience}
                                        onChange={(e) =>
                                            update('yearsOfExperience', e.target.value)
                                        }
                                    />
                                </div>
                                <div>
                                    <Label
                                        htmlFor="learningSource"
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        {tp('learningSource')}
                                    </Label>
                                    <Input
                                        id="learningSource"
                                        value={data.learningSource}
                                        onChange={(e) => update('learningSource', e.target.value)}
                                        placeholder={tp('learningSourcePlaceholder')}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <LocationSelect
                                initialCountry={data.country ?? undefined}
                                initialRegion={data.region ?? undefined}
                                onLocationChange={(c, r) => {
                                    update('country', c)
                                    update('region', r)
                                }}
                            />
                        )}

                        {step === 5 && (
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {[
                                        {
                                            id: 'socialInstagram',
                                            label: tp('socialInstagram'),
                                            icon: FaInstagram,
                                            key: 'socialInstagram' as const,
                                            placeholder: 'yourhandle',
                                        },
                                        {
                                            id: 'socialFacebook',
                                            label: tp('socialFacebook'),
                                            icon: FaFacebook,
                                            key: 'socialFacebook' as const,
                                            placeholder: 'yourhandle',
                                        },
                                        {
                                            id: 'socialTwitter',
                                            label: tp('socialTwitter'),
                                            icon: FaXTwitter,
                                            key: 'socialTwitter' as const,
                                            placeholder: 'yourhandle',
                                        },
                                        {
                                            id: 'socialTiktok',
                                            label: tp('socialTiktok'),
                                            icon: FaTiktok,
                                            key: 'socialTiktok' as const,
                                            placeholder: 'yourhandle',
                                        },
                                        {
                                            id: 'socialYoutube',
                                            label: tp('socialYoutube'),
                                            icon: FaYoutube,
                                            key: 'socialYoutube' as const,
                                            placeholder: 'yourchannel',
                                        },
                                        {
                                            id: 'website',
                                            label: tp('socialWebsite'),
                                            icon: Globe,
                                            key: 'website' as const,
                                            placeholder: 'https://yoursite.com',
                                        },
                                    ].map(({ id, label, icon: Icon, key, placeholder }) => (
                                        <div key={id}>
                                            <Label
                                                htmlFor={id}
                                                className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"
                                            >
                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                {label}
                                            </Label>
                                            <Input
                                                id={id}
                                                value={data[key]}
                                                onChange={(e) => update(key, e.target.value)}
                                                onBlur={
                                                    key === 'website'
                                                        ? () =>
                                                              update(
                                                                  'website',
                                                                  normalizeWebsite(data.website),
                                                              )
                                                        : undefined
                                                }
                                                placeholder={placeholder}
                                                aria-invalid={!!fieldErrors[key] || undefined}
                                            />
                                            {fieldErrors[key] && (
                                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                                    {fieldErrors[key]}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <Label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                                        <Hash className="h-4 w-4 text-muted-foreground" />
                                        {tp('hashtags')}
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={hashtagInput}
                                            onChange={(e) => setHashtagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    addHashtag()
                                                }
                                            }}
                                            placeholder={tp('addHashtag')}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={addHashtag}
                                        >
                                            +
                                        </Button>
                                    </div>
                                    {data.hashtags.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {data.hashtags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                                                >
                                                    #{tag}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            update(
                                                                'hashtags',
                                                                data.hashtags.filter(
                                                                    (t) => t !== tag,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 6 && <ReviewStep data={data} />}

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
                        onClick={back}
                        disabled={step === 1 || submitting}
                    >
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        {t('back')}
                    </Button>

                    <div className="flex items-center gap-2">
                        {step > 1 && step < TOTAL_STEPS && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={next}
                                disabled={submitting}
                            >
                                {t('skip')}
                            </Button>
                        )}
                        {step < TOTAL_STEPS ? (
                            <Button
                                type="button"
                                onClick={next}
                                disabled={(step === 1 && !nameValid) || submitting}
                            >
                                {t('next')}
                                <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting || !nameValid}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        {t('creating')}
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-1.5 h-4 w-4" />
                                        {t('finish')}
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

function ReviewStep({ data }: { data: WizardData }) {
    const t = useTranslations('onboardingWizard')
    const tp = useTranslations('profile')

    const rows: { label: string; value: string | null }[] = [
        { label: t('reviewName'), value: `${data.firstName} ${data.lastName}`.trim() || null },
        {
            label: t('reviewPhotos'),
            value:
                [data.photoMediaId && tp('uploadPhoto'), data.coverMediaId && tp('coverPhoto')]
                    .filter(Boolean)
                    .join(', ') || null,
        },
        { label: tp('bio'), value: data.bio || null },
        {
            label: tp('yearsOfExperience'),
            value: data.yearsOfExperience || null,
        },
        { label: tp('learningSource'), value: data.learningSource || null },
        {
            label: tp('location'),
            value:
                data.region && data.country
                    ? `${data.region}, ${data.country}`
                    : (data.country ?? null),
        },
        { label: tp('socialInstagram'), value: data.socialInstagram || null },
        { label: tp('socialFacebook'), value: data.socialFacebook || null },
        { label: tp('socialTwitter'), value: data.socialTwitter || null },
        { label: tp('socialTiktok'), value: data.socialTiktok || null },
        { label: tp('socialYoutube'), value: data.socialYoutube || null },
        { label: tp('socialWebsite'), value: data.website || null },
        {
            label: tp('hashtags'),
            value: data.hashtags.length > 0 ? data.hashtags.map((h) => `#${h}`).join(' ') : null,
        },
    ]

    return (
        <div className="divide-y divide-border rounded-lg border border-border">
            {rows.map(({ label, value }) => (
                <div
                    key={label}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {label}
                    </span>
                    <span
                        className={`text-sm ${value ? 'font-medium' : 'italic text-muted-foreground'}`}
                    >
                        {value ?? t('skipped')}
                    </span>
                </div>
            ))}
        </div>
    )
}
