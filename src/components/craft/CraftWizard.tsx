'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Images,
    Loader2,
    MapPin,
    Pencil,
    Play,
    Upload,
    X,
} from 'lucide-react'
import { FaYoutube } from 'react-icons/fa6'
import { StepDots } from '@/components/shared/StepDots'
import { parseApiError } from '@/lib/api-error'
import { extractYouTubeId, youtubeThumbnailUrl } from '@/lib/youtube'
import { MAX_IMAGE_MB, MAX_VIDEO_MB, prepareFileForUpload } from '@/lib/media-limits'
import { uploadWithProgress } from '@/lib/upload'

export interface CraftWizardCraft {
    id: string
    title: string
    description: string | null
    materials: string | null
    technique: string | null
    timeToMake: string | null
    width: number | null
    height: number | null
    depth: number | null
    dimensionUnit: string | null
    weight: number | null
    weightUnit: string | null
    inspiration: string | null
    careInstructions: string | null
    isPublic: boolean
    isSharedLocation: boolean
    latitude: number | null
    longitude: number | null
    place: string | null
    videos: string[]
    media: MediaItem[]
}

interface MediaItem {
    mediaId: string
    mimeType: string | null
}

interface UploadRow {
    name: string
    progress: number
    failed: boolean
}

const STEP_BASICS = 0
const STEP_MAKING = 1
const STEP_MEASUREMENTS = 2
const STEP_STORY = 3
const STEP_MEDIA = 4
const STEP_VISIBILITY = 5
const STEP_REVIEW = 6
const TOTAL_STEPS = 7

// Which step each server-validated field lives on, so a 400 sends the artisan
// back to the screen that actually holds the offending value.
const FIELD_STEPS: Record<string, number> = {
    title: STEP_BASICS,
    description: STEP_BASICS,
    materials: STEP_MAKING,
    technique: STEP_MAKING,
    timeToMake: STEP_MAKING,
    width: STEP_MEASUREMENTS,
    height: STEP_MEASUREMENTS,
    depth: STEP_MEASUREMENTS,
    dimensionUnit: STEP_MEASUREMENTS,
    weight: STEP_MEASUREMENTS,
    weightUnit: STEP_MEASUREMENTS,
    inspiration: STEP_STORY,
    careInstructions: STEP_STORY,
    mediaIds: STEP_MEDIA,
    videos: STEP_MEDIA,
    isPublic: STEP_VISIBILITY,
    isSharedLocation: STEP_VISIBILITY,
    latitude: STEP_VISIBILITY,
    longitude: STEP_VISIBILITY,
    place: STEP_VISIBILITY,
}

const kindFromMime = (mime: string | null | undefined): 'image' | 'video' =>
    mime?.startsWith('video/') ? 'video' : 'image'

export function CraftWizard({ craft }: { craft: CraftWizardCraft | null }) {
    const t = useTranslations('createCraft')
    const tw = useTranslations('createCraft.wizard')
    const router = useRouter()

    const isCreateMode = !craft

    // Editing starts on the review screen: everything is already filled in, so
    // the artisan jumps straight to what they came to change.
    const [step, setStep] = useState(isCreateMode ? STEP_BASICS : STEP_REVIEW)
    const [returnToReview, setReturnToReview] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    const [title, setTitle] = useState(craft?.title ?? '')
    const [description, setDescription] = useState(craft?.description ?? '')
    const [materials, setMaterials] = useState(craft?.materials ?? '')
    const [technique, setTechnique] = useState(craft?.technique ?? '')
    const [timeToMake, setTimeToMake] = useState(craft?.timeToMake ?? '')
    const [width, setWidth] = useState(craft?.width?.toString() ?? '')
    const [height, setHeight] = useState(craft?.height?.toString() ?? '')
    const [depth, setDepth] = useState(craft?.depth?.toString() ?? '')
    const [dimensionUnit, setDimensionUnit] = useState(craft?.dimensionUnit ?? 'cm')
    const [weight, setWeight] = useState(craft?.weight?.toString() ?? '')
    const [weightUnit, setWeightUnit] = useState(craft?.weightUnit ?? 'kg')
    const [inspiration, setInspiration] = useState(craft?.inspiration ?? '')
    const [careInstructions, setCareInstructions] = useState(craft?.careInstructions ?? '')
    const [isPublic, setIsPublic] = useState(craft?.isPublic ?? false)
    const [isSharedLocation, setIsSharedLocation] = useState(craft?.isSharedLocation ?? true)
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [resolvedPlace, setResolvedPlace] = useState<string | null>(null)

    // Attached media, whether uploaded here or picked from the gallery. Files
    // are uploaded on selection, so a failed save never re-uploads them.
    const [media, setMedia] = useState<MediaItem[]>(craft?.media ?? [])
    const [uploads, setUploads] = useState<UploadRow[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
    const [videos, setVideos] = useState<string[]>(craft?.videos ?? [])
    const [videoInput, setVideoInput] = useState('')

    const [mediaSource, setMediaSource] = useState<'upload' | 'gallery'>('upload')
    const [gallery, setGallery] = useState<
        { mediaId: string; url: string; mimeType: string | null }[] | null
    >(null)
    const [galleryLoading, setGalleryLoading] = useState(false)
    const [galleryError, setGalleryError] = useState(false)

    // The browser permission prompt only makes sense once the artisan is on the
    // location step and has opted in, and it should not repeat on every visit.
    const locationRequested = useRef(false)
    useEffect(() => {
        if (step !== STEP_VISIBILITY || !isSharedLocation) return
        if (locationRequested.current || !navigator.geolocation) return
        locationRequested.current = true

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude
                const lng = position.coords.longitude
                setLocation({ lat, lng })
                // Resolve the place name now so saving doesn't wait on a
                // geocode round-trip. Non-fatal on failure.
                fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
                    .then((res) => res.json())
                    .then((geo) => {
                        if (geo?.city) setResolvedPlace(geo.city)
                    })
                    .catch(() => {})
            },
            (geoError) => {
                console.error('Geolocation error:', geoError.message)
            },
        )
    }, [step, isSharedLocation])

    function clearFieldError(key: string) {
        setFieldErrors((prev) => {
            if (!(key in prev)) return prev
            const next = { ...prev }
            delete next[key]
            return next
        })
    }

    function showFieldErrors(errors: Record<string, string>) {
        setFieldErrors(errors)
        setError(tw('fixFields'))
        setStep(Math.min(...Object.keys(errors).map((k) => FIELD_STEPS[k] ?? STEP_REVIEW)))
        setIsSubmitting(false)
    }

    function goToStep(target: number) {
        setError(null)
        setReturnToReview(true)
        setStep(target)
    }

    function handleNext() {
        setError(null)
        setStep((s) => Math.min(s + 1, STEP_REVIEW))
    }

    function handleBack() {
        setError(null)
        setStep((s) => Math.max(s - 1, STEP_BASICS))
    }

    async function loadGallery() {
        if (gallery || galleryLoading) return
        setGalleryLoading(true)
        setGalleryError(false)
        try {
            const res = await fetch('/api/media/gallery')
            if (!res.ok) throw new Error()
            setGallery(await res.json())
        } catch {
            setGalleryError(true)
        } finally {
            setGalleryLoading(false)
        }
    }

    function handleSelectSource(source: 'upload' | 'gallery') {
        setMediaSource(source)
        if (source === 'gallery') void loadGallery()
    }

    function toggleGalleryItem(item: { mediaId: string; mimeType: string | null }) {
        setMedia((prev) =>
            prev.some((m) => m.mediaId === item.mediaId)
                ? prev.filter((m) => m.mediaId !== item.mediaId)
                : [...prev, { mediaId: item.mediaId, mimeType: item.mimeType }],
        )
    }

    /**
     * Validate the whole batch, then upload in parallel. Uploading here rather
     * than on submit means a failed save can be retried without duplicating
     * files. Anything that fails stays visible in the progress list.
     */
    async function handleFilesSelected(selected: File[]) {
        if (selected.length === 0) return

        const prepared = await Promise.all(selected.map(prepareFileForUpload))
        const rejected = prepared.find((p) => !p.ok)
        if (rejected && !rejected.ok) {
            setError(
                rejected.reason === 'videoTooLarge'
                    ? t('videoTooLarge', { max: rejected.maxMb })
                    : t('imageTooLarge', { max: rejected.maxMb }),
            )
            return
        }

        const files = prepared.flatMap((p) => (p.ok ? [p.file] : []))
        setError(null)
        setIsUploading(true)
        setUploads(files.map((f) => ({ name: f.name, progress: 0, failed: false })))

        const results = await Promise.all(
            files.map((file, i) =>
                uploadWithProgress(file, (pct) =>
                    setUploads((prev) => prev.map((u, j) => (j === i ? { ...u, progress: pct } : u))),
                ).then((outcome) => {
                    if (!outcome.ok) {
                        setUploads((prev) =>
                            prev.map((u, j) => (j === i ? { ...u, failed: true } : u)),
                        )
                        return null
                    }
                    return { mediaId: outcome.media.id, mimeType: outcome.media.mimeType }
                }),
            ),
        )

        const uploaded = results.filter((r): r is MediaItem => r !== null)
        if (uploaded.length > 0) {
            setMedia((prev) => [...prev, ...uploaded])
            clearFieldError('mediaIds')
        }
        setIsUploading(false)

        if (uploaded.length < files.length) {
            setError(t('uploadFailed'))
        } else {
            setUploads([])
        }
    }

    // Detaches locally only; the file stays in the artisan's media gallery and
    // is garbage-collected server-side if nothing else references it.
    function handleRemoveMedia(mediaId: string) {
        if (confirmRemove !== mediaId) {
            setConfirmRemove(mediaId)
            return
        }
        setConfirmRemove(null)
        setMedia((prev) => prev.filter((m) => m.mediaId !== mediaId))
    }

    function handleAddVideo() {
        const id = extractYouTubeId(videoInput)
        if (!id) {
            setError(t('invalidYoutubeUrl'))
            return
        }
        if (!videos.includes(id)) setVideos((prev) => [...prev, id])
        setVideoInput('')
        setError(null)
        clearFieldError('videos')
    }

    async function handleSubmit() {
        setIsSubmitting(true)
        setError(null)
        setFieldErrors({})

        // Only send coordinates when the artisan opted to share them.
        let latitude: number | null = craft?.latitude ?? null
        let longitude: number | null = craft?.longitude ?? null
        let place: string | null = craft?.place ?? null

        if (isSharedLocation) {
            if (location) {
                latitude = location.lat
                longitude = location.lng
                place = resolvedPlace ?? place
            }
        } else {
            latitude = null
            longitude = null
            place = null
        }

        const payload = {
            title,
            description,
            materials: materials || undefined,
            technique: technique || undefined,
            timeToMake: timeToMake || undefined,
            width: width ? parseFloat(width) : undefined,
            height: height ? parseFloat(height) : undefined,
            depth: depth ? parseFloat(depth) : undefined,
            dimensionUnit,
            weight: weight ? parseFloat(weight) : undefined,
            weightUnit,
            inspiration: inspiration || undefined,
            careInstructions: careInstructions || undefined,
            isPublic,
            isSharedLocation,
            latitude,
            longitude,
            place,
            videos,
            mediaIds: media.map((m) => m.mediaId),
        }

        try {
            const res = await fetch(isCreateMode ? '/api/crafts' : `/api/crafts/${craft.id}`, {
                method: isCreateMode ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const parsed = await parseApiError(res)
                const errors: Record<string, string> = {}
                for (const issue of parsed.issues) {
                    errors[issue.path.split('.')[0]] = issue.message
                }
                if (Object.keys(errors).length > 0) {
                    showFieldErrors(errors)
                    return
                }
                setError(parsed.error || t(isCreateMode ? 'createFailed' : 'updateFailed'))
                setIsSubmitting(false)
                return
            }

            const saved = await res.json()
            // Stays disabled on success: router.push doesn't unmount the wizard
            // immediately, and re-enabling here allowed duplicate submissions.
            router.push(`/crafts/${saved.id}`)
        } catch {
            setError(t(isCreateMode ? 'createFailed' : 'updateFailed'))
            setIsSubmitting(false)
        }
    }

    async function handleDelete() {
        if (!confirm(t('deleteCraftConfirm'))) return
        const res = await fetch(`/api/crafts/${craft?.id}`, { method: 'DELETE' })
        if (res.ok) router.push('/crafts')
    }

    const fieldError = (key: string) =>
        fieldErrors[key] ? (
            <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors[key]}</p>
        ) : null

    const canAdvance = step !== STEP_BASICS || title.trim().length > 0
    const backHref = isCreateMode ? '/crafts' : `/crafts/${craft.id}`

    return (
        <Card className="mx-auto max-w-2xl overflow-hidden rounded-2xl shadow-lg">
            <div className="px-6 py-6" style={{ background: 'var(--sc-ink-deep)' }}>
                <div className="flex items-center gap-3">
                    <Link
                        href={backHref}
                        className="rounded-md p-2 text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-left text-2xl font-bold tracking-tight text-primary-foreground">
                            {isCreateMode ? t('createCraftTitle') : t('editCraftTitle')}
                        </h1>
                        <p className="text-left text-sm text-primary-foreground/70">
                            {isCreateMode ? t('createCraftHelper') : t('createEdittHelper')}
                        </p>
                    </div>
                </div>
            </div>

            <CardContent className="p-6">
                <StepDots current={step} total={TOTAL_STEPS} />
                <p className="mb-8 text-center text-xs text-muted-foreground">
                    {tw('stepLabel', { current: step + 1, total: TOTAL_STEPS })}
                </p>

                <div key={step} className="animate-in fade-in-50 slide-in-from-right-4 duration-300">
                    {step === STEP_BASICS && (
                        <StepShell title={tw('basics.title')} hint={tw('basics.hint')}>
                            <div className="space-y-2">
                                <Label htmlFor="title">{t('createCraftName')}</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value)
                                        clearFieldError('title')
                                    }}
                                    autoFocus
                                    required
                                />
                                {fieldError('title')}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">{t('createCraftDescription')}</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value)
                                        clearFieldError('description')
                                    }}
                                    placeholder={t('createCraftDescriptionPlaceholder')}
                                    rows={5}
                                />
                                {fieldError('description')}
                            </div>
                        </StepShell>
                    )}

                    {step === STEP_MAKING && (
                        <StepShell title={tw('making.title')} hint={tw('making.hint')}>
                            <div className="space-y-2">
                                <Label htmlFor="materials">{t('createCraftMaterial')}</Label>
                                <Textarea
                                    id="materials"
                                    value={materials}
                                    onChange={(e) => setMaterials(e.target.value)}
                                    placeholder={t('createCraftMaterialsPlaceholder')}
                                    rows={3}
                                />
                                {fieldError('materials')}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="technique">{t('createCraftTechnique')}</Label>
                                <Textarea
                                    id="technique"
                                    value={technique}
                                    onChange={(e) => setTechnique(e.target.value)}
                                    placeholder={t('createCraftTechniquePlaceholder')}
                                    rows={3}
                                />
                                {fieldError('technique')}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="timeToMake">{t('createCraftTimeToMake')}</Label>
                                <Input
                                    id="timeToMake"
                                    value={timeToMake}
                                    onChange={(e) => setTimeToMake(e.target.value)}
                                    placeholder={t('createCraftTimeToMakePlaceholder')}
                                />
                                {fieldError('timeToMake')}
                            </div>
                        </StepShell>
                    )}

                    {step === STEP_MEASUREMENTS && (
                        <StepShell title={tw('measurements.title')} hint={tw('measurements.hint')}>
                            <div className="space-y-2">
                                <Label>{t('createCraftDimensions')}</Label>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={width}
                                        onChange={(e) => setWidth(e.target.value)}
                                        placeholder={t('dimensionWidth')}
                                        aria-label={t('dimensionWidth')}
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                        placeholder={t('dimensionHeight')}
                                        aria-label={t('dimensionHeight')}
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={depth}
                                        onChange={(e) => setDepth(e.target.value)}
                                        placeholder={t('dimensionDepth')}
                                        aria-label={t('dimensionDepth')}
                                    />
                                    <Select value={dimensionUnit} onValueChange={setDimensionUnit}>
                                        <SelectTrigger aria-label={t('dimensionUnit')}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cm">cm</SelectItem>
                                            <SelectItem value="in">in</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {fieldError('width') ?? fieldError('height') ?? fieldError('depth')}
                            </div>

                            <div className="space-y-2">
                                <Label>{t('createCraftWeight')}</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        placeholder={t('createCraftWeight')}
                                        aria-label={t('createCraftWeight')}
                                    />
                                    <Select value={weightUnit} onValueChange={setWeightUnit}>
                                        <SelectTrigger aria-label={t('weightUnit')}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="g">g</SelectItem>
                                            <SelectItem value="kg">kg</SelectItem>
                                            <SelectItem value="oz">oz</SelectItem>
                                            <SelectItem value="lb">lb</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {fieldError('weight')}
                            </div>
                        </StepShell>
                    )}

                    {step === STEP_STORY && (
                        <StepShell title={tw('story.title')} hint={tw('story.hint')}>
                            <div className="space-y-2">
                                <Label htmlFor="inspiration">{t('createCraftInspiration')}</Label>
                                <Textarea
                                    id="inspiration"
                                    value={inspiration}
                                    onChange={(e) => setInspiration(e.target.value)}
                                    placeholder={t('createCraftInspirationPlaceholder')}
                                    rows={4}
                                />
                                {fieldError('inspiration')}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="careInstructions">
                                    {t('createCraftCareInstructions')}
                                </Label>
                                <Textarea
                                    id="careInstructions"
                                    value={careInstructions}
                                    onChange={(e) => setCareInstructions(e.target.value)}
                                    placeholder={t('createCraftCareInstructionsPlaceholder')}
                                    rows={4}
                                />
                                {fieldError('careInstructions')}
                            </div>
                        </StepShell>
                    )}

                    {step === STEP_MEDIA && (
                        <StepShell title={tw('media.title')} hint={tw('media.hint')}>
                            <div className="space-y-3">
                                <Label>{t('uploadImages')}</Label>

                                {media.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                        {media.map(({ mediaId, mimeType }) => (
                                            <div
                                                key={mediaId}
                                                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                                            >
                                                {kindFromMime(mimeType) === 'video' ? (
                                                    <>
                                                        <video
                                                            src={`/api/media/${mediaId}`}
                                                            muted
                                                            playsInline
                                                            preload="metadata"
                                                            className="h-full w-full object-cover"
                                                        />
                                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                                            <div className="rounded-full bg-black/55 p-2">
                                                                <Play className="h-4 w-4 fill-white text-white" />
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Image
                                                        src={`/api/media/${mediaId}`}
                                                        alt={t('uploadImages')}
                                                        fill
                                                        sizes="(max-width: 768px) 33vw, 25vw"
                                                        className="object-cover"
                                                    />
                                                )}
                                                {confirmRemove === mediaId ? (
                                                    <div
                                                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-1.5 text-center"
                                                        style={{
                                                            backgroundColor: 'oklch(0.08 0.01 250 / 0.7)',
                                                        }}
                                                    >
                                                        <p className="text-xs font-medium text-white">
                                                            {t('deleteImageConfirm')}
                                                        </p>
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveMedia(mediaId)}
                                                                className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700"
                                                            >
                                                                {t('deleteImageYes')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setConfirmRemove(null)}
                                                                className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white hover:bg-white/30"
                                                            >
                                                                {t('deleteImageNo')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMedia(mediaId)}
                                                        aria-label={t('deleteImage')}
                                                        className="absolute right-1 top-1 rounded-full p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                                        style={{
                                                            backgroundColor: 'oklch(0.08 0.01 250 / 0.6)',
                                                        }}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="inline-flex rounded-lg border border-border p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectSource('upload')}
                                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                            mediaSource === 'upload'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <Upload className="h-4 w-4" />
                                        {t('uploadTab')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectSource('gallery')}
                                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                            mediaSource === 'gallery'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <Images className="h-4 w-4" />
                                        {t('galleryTab')}
                                    </button>
                                </div>

                                {mediaSource === 'upload' ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="outline"
                                                type="button"
                                                disabled={isUploading}
                                                onClick={() =>
                                                    document.getElementById('craft-files')?.click()
                                                }
                                            >
                                                {isUploading && (
                                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                )}
                                                {t('browse')}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('uploadLimitsHint', {
                                                imageMax: MAX_IMAGE_MB,
                                                videoMax: MAX_VIDEO_MB,
                                            })}
                                        </p>
                                        <input
                                            type="file"
                                            id="craft-files"
                                            accept="image/*,video/*"
                                            multiple
                                            className="hidden"
                                            onChange={async (e) => {
                                                const input = e.target
                                                const selected = Array.from(input.files || [])
                                                input.value = ''
                                                await handleFilesSelected(selected)
                                            }}
                                        />
                                    </>
                                ) : (
                                    <div>
                                        <p className="mb-2 text-sm text-muted-foreground">
                                            {t('galleryHint')}
                                        </p>
                                        {galleryLoading && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {t('galleryLoading')}
                                            </div>
                                        )}
                                        {galleryError && (
                                            <p className="text-sm text-red-600">
                                                {t('galleryLoadFailed')}
                                            </p>
                                        )}
                                        {!galleryLoading && !galleryError && gallery?.length === 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                {t('galleryEmpty')}
                                            </p>
                                        )}
                                        {!galleryLoading && gallery && gallery.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                                {gallery.map((item) => {
                                                    const selected = media.some(
                                                        (m) => m.mediaId === item.mediaId,
                                                    )
                                                    return (
                                                        <button
                                                            key={item.mediaId}
                                                            type="button"
                                                            onClick={() => toggleGalleryItem(item)}
                                                            aria-pressed={selected}
                                                            className={`group relative aspect-square overflow-hidden rounded-lg border bg-muted transition-colors ${
                                                                selected
                                                                    ? 'border-primary ring-2 ring-primary'
                                                                    : 'border-border'
                                                            }`}
                                                        >
                                                            {kindFromMime(item.mimeType) === 'video' ? (
                                                                <>
                                                                    <video
                                                                        src={item.url}
                                                                        muted
                                                                        playsInline
                                                                        preload="metadata"
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                                                        <div className="rounded-full bg-black/55 p-2">
                                                                            <Play className="h-4 w-4 fill-white text-white" />
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <Image
                                                                    src={item.url}
                                                                    alt={t('galleryTab')}
                                                                    fill
                                                                    sizes="(max-width: 768px) 33vw, 25vw"
                                                                    className="object-cover"
                                                                />
                                                            )}
                                                            {selected && (
                                                                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                                    <Check className="h-3.5 w-3.5" />
                                                                </span>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {uploads.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                        {uploads.map((u, i) => (
                                            <div key={i} className="text-sm">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="truncate text-muted-foreground">
                                                        {u.name}
                                                    </span>
                                                    <span
                                                        className={`shrink-0 tabular-nums ${
                                                            u.failed
                                                                ? 'text-red-600'
                                                                : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        {u.failed ? t('failed') : `${u.progress}%`}
                                                    </span>
                                                </div>
                                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            u.failed ? 'bg-red-500' : 'bg-primary'
                                                        }`}
                                                        style={{
                                                            width: `${u.failed ? 100 : u.progress}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="videoUrl" className="flex items-center gap-1.5">
                                    <FaYoutube className="h-4 w-4" />
                                    {t('videosLabel')}
                                </Label>

                                {videos.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {videos.map((id) => (
                                            <div
                                                key={id}
                                                className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-muted"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={youtubeThumbnailUrl(id)}
                                                    alt={t('videosLabel')}
                                                    className="absolute inset-0 h-full w-full object-cover"
                                                />
                                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                                    <div className="rounded-full bg-black/60 p-2">
                                                        <Play className="h-5 w-5 fill-white text-white" />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setVideos((prev) => prev.filter((v) => v !== id))
                                                    }
                                                    aria-label={t('removeVideo')}
                                                    className="absolute right-1 top-1 rounded-full p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                                    style={{
                                                        backgroundColor: 'oklch(0.08 0.01 250 / 0.6)',
                                                    }}
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Input
                                        id="videoUrl"
                                        type="url"
                                        value={videoInput}
                                        onChange={(e) => setVideoInput(e.target.value)}
                                        placeholder={t('youtubePlaceholder')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                handleAddVideo()
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="outline" onClick={handleAddVideo}>
                                        {t('addVideo')}
                                    </Button>
                                </div>
                                {fieldError('videos')}
                            </div>
                        </StepShell>
                    )}

                    {step === STEP_VISIBILITY && (
                        <StepShell title={tw('visibility.title')} hint={tw('visibility.hint')}>
                            <div className="flex flex-col gap-3">
                                <label
                                    htmlFor="isPublic"
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        id="isPublic"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        className="rounded border-input"
                                    />
                                    {t('createCraftPublic')}
                                </label>
                                <label
                                    htmlFor="isSharedLocation"
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        id="isSharedLocation"
                                        checked={isSharedLocation}
                                        onChange={(e) => setIsSharedLocation(e.target.checked)}
                                        className="rounded border-input"
                                    />
                                    {t('createCraftMakeLocationPublic')}
                                </label>
                            </div>

                            {isSharedLocation && (
                                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    {resolvedPlace ??
                                        (location ? tw('locationFound') : tw('locationPending'))}
                                </p>
                            )}
                        </StepShell>
                    )}

                    {step === STEP_REVIEW && (
                        <StepShell title={tw('review.title')} hint={tw('review.hint')}>
                            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                                <ReviewRow
                                    label={t('createCraftName')}
                                    value={title}
                                    empty={tw('review.notAdded')}
                                    editLabel={tw('review.edit')}
                                    onEdit={() => goToStep(STEP_BASICS)}
                                />
                                <ReviewRow
                                    label={t('createCraftDescription')}
                                    value={description}
                                    empty={tw('review.notAdded')}
                                    editLabel={tw('review.edit')}
                                    onEdit={() => goToStep(STEP_BASICS)}
                                />
                                <ReviewRow
                                    label={tw('making.title')}
                                    value={[materials, technique, timeToMake]
                                        .filter(Boolean)
                                        .join(' / ')}
                                    empty={tw('review.notAdded')}
                                    editLabel={tw('review.edit')}
                                    onEdit={() => goToStep(STEP_MAKING)}
                                />
                                <ReviewRow
                                    label={tw('measurements.title')}
                                    value={[
                                        [width, height, depth].filter(Boolean).length > 0
                                            ? `${[width, height, depth].filter(Boolean).join(' x ')} ${dimensionUnit}`
                                            : '',
                                        weight ? `${weight} ${weightUnit}` : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' / ')}
                                    empty={tw('review.notAdded')}
                                    editLabel={tw('review.edit')}
                                    onEdit={() => goToStep(STEP_MEASUREMENTS)}
                                />
                                <ReviewRow
                                    label={tw('story.title')}
                                    value={[inspiration, careInstructions].filter(Boolean).join(' / ')}
                                    empty={tw('review.notAdded')}
                                    editLabel={tw('review.edit')}
                                    onEdit={() => goToStep(STEP_STORY)}
                                />
                                <ReviewRow
                                    label={tw('media.title')}
                                    value={tw('review.mediaCount', {
                                        photos: media.length,
                                        videos: videos.length,
                                    })}
                                    empty={tw('review.notAdded')}
                                    editLabel={tw('review.edit')}
                                    onEdit={() => goToStep(STEP_MEDIA)}
                                />
                                <ReviewRow
                                    label={tw('visibility.title')}
                                    value={
                                        isPublic ? tw('review.isPublic') : tw('review.isPrivate')
                                    }
                                    empty={tw('review.notAdded')}
                                    editLabel={tw('review.edit')}
                                    onEdit={() => goToStep(STEP_VISIBILITY)}
                                />
                            </div>

                            {!isCreateMode && (
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.push(`/crafts/${craft.id}`)}
                                    >
                                        {t('cancelEdit')}
                                    </Button>
                                    <Button type="button" variant="destructive" onClick={handleDelete}>
                                        {t('deleteCraft')}
                                    </Button>
                                </div>
                            )}
                        </StepShell>
                    )}

                    {error && (
                        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                            {error}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        disabled={step === STEP_BASICS || isSubmitting}
                        className="w-full sm:w-auto"
                    >
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        {tw('back')}
                    </Button>

                    <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
                        {returnToReview && step < STEP_REVIEW ? (
                            <Button
                                type="button"
                                onClick={() => {
                                    setReturnToReview(false)
                                    setStep(STEP_REVIEW)
                                }}
                                className="w-full sm:w-auto"
                            >
                                <Check className="mr-1.5 h-4 w-4" />
                                {tw('backToReview')}
                            </Button>
                        ) : step < STEP_REVIEW ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                disabled={!canAdvance}
                                className="w-full sm:w-auto"
                            >
                                {tw('next')}
                                <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting || isUploading || !title.trim()}
                                className="w-full sm:w-auto"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        {isCreateMode ? t('savingCraft') : t('updatingCraft')}
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-1.5 h-4 w-4" />
                                        {isCreateMode ? t('saveCraft') : t('updateCraft')}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function StepShell({
    title,
    hint,
    children,
}: {
    title: string
    hint: string
    children: React.ReactNode
}) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
            </div>
            {children}
        </div>
    )
}

function ReviewRow({
    label,
    value,
    empty,
    editLabel,
    onEdit,
}: {
    label: string
    value: string
    empty: string
    editLabel: string
    onEdit: () => void
}) {
    const filled = value.trim().length > 0
    return (
        <button
            type="button"
            onClick={onEdit}
            className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50"
        >
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                </p>
                <p
                    className={`mt-1 line-clamp-2 text-sm ${
                        filled ? 'text-foreground' : 'italic text-muted-foreground'
                    }`}
                >
                    {filled ? value : empty}
                </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                <Pencil className="h-3 w-3" />
                {editLabel}
            </span>
        </button>
    )
}
