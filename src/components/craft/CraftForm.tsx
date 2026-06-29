'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
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
import { ArrowLeft, Loader2, X, Play, Check, Upload, Images } from 'lucide-react'
import { FaYoutube } from 'react-icons/fa6'
import { useRouter } from 'next/navigation'
import { extractYouTubeId, youtubeThumbnailUrl } from '@/lib/youtube'

interface Craft {
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

type MediaKind = 'image' | 'video'

interface MediaItem {
    mediaId: string
    mimeType: string | null
}

interface CraftFormProps {
    craft: Craft | null
}

const kindFromMime = (mime: string | null | undefined): MediaKind =>
    mime?.startsWith('video/') ? 'video' : 'image'

// Upload a single file via XHR so we can report upload progress. Resolves to
// the new media id, or undefined if the upload failed (the caller filters those
// out, mirroring the previous fetch behaviour).
function uploadFileWithProgress(file: File, onProgress: (pct: number) => void): Promise<string | undefined> {
    return new Promise((resolve) => {
        const formData = new FormData()
        formData.append('file', file)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/media/upload')
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress(100)
                try {
                    resolve(JSON.parse(xhr.responseText)?.id)
                } catch {
                    resolve(undefined)
                }
            } else {
                resolve(undefined)
            }
        }
        xhr.onerror = () => resolve(undefined)
        xhr.send(formData)
    })
}

export function CraftForm({ craft }: CraftFormProps) {
    const t = useTranslations('')
    const router = useRouter()

    const isCreateMode = !craft

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const [name, setName] = useState(craft?.title ?? '')
    const [description, setDescription] = useState(craft?.description ?? '')
    const [materials, setMaterials] = useState<string>(craft?.materials ?? '')
    const [technique, setTechnique] = useState<string>(craft?.technique ?? '')
    const [timeToMake, setTimeToMake] = useState<string>(craft?.timeToMake ?? '')
    const [width, setWidth] = useState<string>(craft?.width?.toString() ?? '')
    const [height, setHeight] = useState<string>(craft?.height?.toString() ?? '')
    const [depth, setDepth] = useState<string>(craft?.depth?.toString() ?? '')
    const [dimensionUnit, setDimensionUnit] = useState<string>(craft?.dimensionUnit ?? 'cm')
    const [weight, setWeight] = useState<string>(craft?.weight?.toString() ?? '')
    const [weightUnit, setWeightUnit] = useState<string>(craft?.weightUnit ?? 'kg')
    const [inspiration, setInspiration] = useState<string>(craft?.inspiration ?? '')
    const [careInstructions, setCareInstructions] = useState<string>(craft?.careInstructions ?? '')
    const [isPublic, setIsPublic] = useState<boolean>(craft?.isPublic ?? false)
    const [isSharedLocation, setIsSharedLocation] = useState<boolean>(craft?.isSharedLocation ?? true)
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [existingMedia, setExistingMedia] = useState<MediaItem[]>(craft?.media ?? [])
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [files, setFiles] = useState<File[]>([])
    const [uploads, setUploads] = useState<{ name: string; progress: number; failed: boolean }[]>([])
    const [videos, setVideos] = useState<string[]>(craft?.videos ?? [])
    const [videoInput, setVideoInput] = useState('')

    // Media source: upload fresh files, or reuse media from the gallery.
    const [mediaSource, setMediaSource] = useState<'upload' | 'gallery'>('upload')
    const [gallery, setGallery] = useState<{ mediaId: string; url: string; mimeType: string | null }[] | null>(null)
    const [galleryLoading, setGalleryLoading] = useState(false)
    const [galleryError, setGalleryError] = useState(false)

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

    function handleSelectGallery(source: 'upload' | 'gallery') {
        setMediaSource(source)
        if (source === 'gallery') void loadGallery()
    }

    // Toggle a gallery item into/out of the craft's attached media.
    function toggleGalleryItem(item: { mediaId: string; mimeType: string | null }) {
        setExistingMedia(prev =>
            prev.some(m => m.mediaId === item.mediaId)
                ? prev.filter(m => m.mediaId !== item.mediaId)
                : [...prev, { mediaId: item.mediaId, mimeType: item.mimeType }],
        )
    }

    function handleAddVideo() {
        const id = extractYouTubeId(videoInput)
        if (!id) {
            setMessage({ text: t('createCraft.invalidYoutubeUrl'), type: 'error' })
            return
        }
        if (videos.includes(id)) {
            setVideoInput('')
            return
        }
        setVideos(prev => [...prev, id])
        setVideoInput('')
        setMessage(null)
    }

    function handleRemoveVideo(id: string) {
        setVideos(prev => prev.filter(v => v !== id))
    }

    // Remove from local state only; the underlying file is garbage-collected
    // server-side on save when the new mediaIds list is reconciled.
    function handleRemoveExisting(mediaId: string) {
        if (confirmDelete !== mediaId) {
            setConfirmDelete(mediaId)
            return
        }
        setConfirmDelete(null)
        setExistingMedia(prev => prev.filter(m => m.mediaId !== mediaId))
    }

    useEffect(() => {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                })
            },
            (error) => {
                console.error('Geolocation error:', error.message)
            }
        )
    }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        // Resolve location: only when the artisan opts to share it.
        let latitude: number | null = craft?.latitude ?? null
        let longitude: number | null = craft?.longitude ?? null
        let place: string | null = craft?.place ?? null

        if (isSharedLocation) {
            if (location?.lat && location?.lng) {
                latitude = location.lat
                longitude = location.lng
                try {
                    const geoRes = await fetch(`/api/geocode?lat=${location.lat}&lng=${location.lng}`)
                    const geoData = await geoRes.json()
                    place = geoData.city ?? place
                } catch {
                    // Non-fatal — keep any existing place value.
                }
            }
        } else {
            latitude = null
            longitude = null
            place = null
        }

        let newIds: (string | undefined)[] = []
        if (files.length > 0) {
            setUploads(files.map(f => ({ name: f.name, progress: 0, failed: false })))
            newIds = await Promise.all(
                files.map((file, i) =>
                    uploadFileWithProgress(file, (pct) =>
                        setUploads(prev => prev.map((u, j) => (j === i ? { ...u, progress: pct } : u))),
                    ).then((id) => {
                        if (!id) setUploads(prev => prev.map((u, j) => (j === i ? { ...u, failed: true } : u)))
                        return id
                    }),
                ),
            )
        }
        if (newIds.some(id => !id)) {
            setMessage({ text: t('createCraft.uploadFailed'), type: 'error' })
            setIsSubmitting(false)
            return
        }
        const mediaIds = [...existingMedia.map(m => m.mediaId), ...newIds].filter(Boolean) as string[]

        const payload = {
            title: name,
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
            mediaIds,
        }

        try {
            const url = isCreateMode ? '/api/crafts' : `/api/crafts/${craft?.id}`
            const method = isCreateMode ? 'POST' : 'PUT'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) throw new Error('Request failed')

            setMessage({
                text: isCreateMode ? t('createCraft.craftCreateSuccess') : t('createCraft.craftUpdateSuccess'),
                type: 'success',
            })

            const newCraft = await res.json()
            router.push(`/crafts/${newCraft.id}`)
        } catch {
            setMessage({
                text: isCreateMode ? t('createCraft.createFailed') : t('createCraft.updateFailed'),
                type: 'error',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    function handleCancelEdit() {
        router.push(`/crafts/${craft?.id}`)
    }

    async function handleDelete() {
        if (!confirm(t('createCraft.deleteCraftConfirm'))) return

        // The craft DELETE endpoint cascades attachments and garbage-collects
        // the underlying media files server-side.
        const res = await fetch(`/api/crafts/${craft?.id}`, { method: 'DELETE' })
        if (res.ok) router.push('/crafts')
    }

    return (
        <Card className="mx-auto max-w-2xl overflow-hidden rounded-2xl shadow-lg">
            <div className="bg-primary px-6 py-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/crafts"
                        className="rounded-md p-2 text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-left text-2xl font-bold tracking-tight text-primary-foreground">
                            {isCreateMode
                                ? t('createCraft.createCraftTitle')
                                : t('createCraft.editCraftTitle')}
                        </h1>
                        <p className="text-left text-sm text-primary-foreground/70">
                            {isCreateMode
                                ? t('createCraft.createCraftHelper')
                                : t('createCraft.createEdittHelper')}
                        </p>
                    </div>
                </div>
            </div>

            <CardContent className="p-6">
                {message && (
                    <div
                        className={`mb-6 rounded-lg p-3 text-sm ${
                            message.type === 'success'
                                ? 'bg-green-50 text-green-800'
                                : 'bg-red-50 text-red-800'
                        }`}
                    >
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="name">
                            {t('createCraft.createCraftName')}
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">
                            {t('createCraft.createCraftDescription')}
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('createCraft.createCraftDescriptionPlaceholder')}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="materials">
                            {t('createCraft.createCraftMaterial')}
                        </Label>
                        <Textarea
                            id="materials"
                            value={materials}
                            onChange={(e) => setMaterials(e.target.value)}
                            placeholder={t('createCraft.createCraftMaterialsPlaceholder')}
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="technique">
                            {t('createCraft.createCraftTechnique')}
                        </Label>
                        <Textarea
                            id="technique"
                            value={technique}
                            onChange={(e) => setTechnique(e.target.value)}
                            placeholder={t('createCraft.createCraftTechniquePlaceholder')}
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="timeToMake">
                            {t('createCraft.createCraftTimeToMake')}
                        </Label>
                        <Input
                            id="timeToMake"
                            value={timeToMake}
                            onChange={(e) => setTimeToMake(e.target.value)}
                            placeholder={t('createCraft.createCraftTimeToMakePlaceholder')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t('createCraft.createCraftDimensions')}</Label>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Input
                                type="number"
                                min="0"
                                step="any"
                                value={width}
                                onChange={(e) => setWidth(e.target.value)}
                                placeholder={t('createCraft.dimensionWidth')}
                                aria-label={t('createCraft.dimensionWidth')}
                            />
                            <Input
                                type="number"
                                min="0"
                                step="any"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                placeholder={t('createCraft.dimensionHeight')}
                                aria-label={t('createCraft.dimensionHeight')}
                            />
                            <Input
                                type="number"
                                min="0"
                                step="any"
                                value={depth}
                                onChange={(e) => setDepth(e.target.value)}
                                placeholder={t('createCraft.dimensionDepth')}
                                aria-label={t('createCraft.dimensionDepth')}
                            />
                            <Select value={dimensionUnit} onValueChange={setDimensionUnit}>
                                <SelectTrigger aria-label={t('createCraft.dimensionUnit')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cm">cm</SelectItem>
                                    <SelectItem value="in">in</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('createCraft.createCraftWeight')}</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                type="number"
                                min="0"
                                step="any"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder={t('createCraft.createCraftWeight')}
                                aria-label={t('createCraft.createCraftWeight')}
                            />
                            <Select value={weightUnit} onValueChange={setWeightUnit}>
                                <SelectTrigger aria-label={t('createCraft.weightUnit')}>
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
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="inspiration">
                            {t('createCraft.createCraftInspiration')}
                        </Label>
                        <Textarea
                            id="inspiration"
                            value={inspiration}
                            onChange={(e) => setInspiration(e.target.value)}
                            placeholder={t('createCraft.createCraftInspirationPlaceholder')}
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="careInstructions">
                            {t('createCraft.createCraftCareInstructions')}
                        </Label>
                        <Textarea
                            id="careInstructions"
                            value={careInstructions}
                            onChange={(e) => setCareInstructions(e.target.value)}
                            placeholder={t('createCraft.createCraftCareInstructionsPlaceholder')}
                            rows={3}
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="isPublic" className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="rounded border-input"
                            />
                            {t('createCraft.createCraftPublic')}
                        </label>
                        <label htmlFor="isSharedLocation" className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                id="isSharedLocation"
                                checked={isSharedLocation}
                                onChange={(e) => setIsSharedLocation(e.target.checked)}
                                className="rounded border-input"
                            />
                            {t('createCraft.createCraftMakeLocationPublic')}
                        </label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="images">
                            {t('createCraft.uploadImages')}
                        </Label>

                        {existingMedia.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {existingMedia.map(({ mediaId, mimeType }) => (
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
                                                alt="Craft media"
                                                fill
                                                sizes="(max-width: 768px) 33vw, 25vw"
                                                unoptimized
                                                className="object-cover"
                                            />
                                        )}
                                        {confirmDelete === mediaId ? (
                                            <div
                                                className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-1.5 text-center"
                                                style={{ backgroundColor: 'oklch(0.08 0.01 250 / 0.7)' }}
                                            >
                                                <p className="text-xs font-medium text-white">
                                                    {t('createCraft.deleteImageConfirm')}
                                                </p>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveExisting(mediaId)}
                                                        className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700"
                                                    >
                                                        {t('createCraft.deleteImageYes')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDelete(null)}
                                                        className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white hover:bg-white/30"
                                                    >
                                                        {t('createCraft.deleteImageNo')}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveExisting(mediaId)}
                                                aria-label={t('createCraft.deleteImage')}
                                                className="absolute right-1 top-1 rounded-full p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                                style={{ backgroundColor: 'oklch(0.08 0.01 250 / 0.6)' }}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Source toggle: upload fresh files or reuse the gallery */}
                        <div className="inline-flex rounded-lg border border-border p-0.5">
                            <button
                                type="button"
                                onClick={() => handleSelectGallery('upload')}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    mediaSource === 'upload'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Upload className="h-4 w-4" />
                                {t('createCraft.uploadTab')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSelectGallery('gallery')}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    mediaSource === 'gallery'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Images className="h-4 w-4" />
                                {t('createCraft.galleryTab')}
                            </button>
                        </div>

                        {mediaSource === 'upload' ? (
                            <>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={() => document.getElementById('images')?.click()}
                                    >
                                        {t('createCraft.browse')}
                                    </Button>
                                    {files.length > 0 && (
                                        <span className="text-sm text-muted-foreground">
                                            {files.length} {t('createCraft.filesSelected')}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    id="images"
                                    accept="image/*,video/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.files || [])
                                        const oversized = selected.find(f => f.size > 100 * 1024 * 1024)
                                        if (oversized) {
                                            setMessage({ text: t('createCraft.mediaTooLarge'), type: 'error' })
                                            e.target.value = ''
                                            return
                                        }
                                        setUploads([])
                                        setFiles(selected)
                                    }}
                                />
                            </>
                        ) : (
                            <div>
                                <p className="mb-2 text-sm text-muted-foreground">{t('createCraft.galleryHint')}</p>
                                {galleryLoading && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t('createCraft.galleryLoading')}
                                    </div>
                                )}
                                {galleryError && (
                                    <p className="text-sm text-red-600">{t('createCraft.galleryLoadFailed')}</p>
                                )}
                                {!galleryLoading && !galleryError && gallery?.length === 0 && (
                                    <p className="text-sm text-muted-foreground">{t('createCraft.galleryEmpty')}</p>
                                )}
                                {!galleryLoading && gallery && gallery.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                        {gallery.map((item) => {
                                            const selected = existingMedia.some(m => m.mediaId === item.mediaId)
                                            return (
                                                <button
                                                    key={item.mediaId}
                                                    type="button"
                                                    onClick={() => toggleGalleryItem(item)}
                                                    aria-pressed={selected}
                                                    className={`group relative aspect-square overflow-hidden rounded-lg border bg-muted transition-colors ${
                                                        selected ? 'border-primary ring-2 ring-primary' : 'border-border'
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
                                                            alt="Gallery media"
                                                            fill
                                                            sizes="(max-width: 768px) 33vw, 25vw"
                                                            unoptimized
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
                                            <span className="truncate text-muted-foreground">{u.name}</span>
                                            <span className={`shrink-0 tabular-nums ${u.failed ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                {u.failed ? t('createCraft.failed') : `${u.progress}%`}
                                            </span>
                                        </div>
                                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={`h-full rounded-full transition-all ${u.failed ? 'bg-red-500' : 'bg-primary'}`}
                                                style={{ width: `${u.failed ? 100 : u.progress}%` }}
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
                            {t('createCraft.videosLabel')}
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
                                            alt="YouTube video"
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                            <div className="rounded-full bg-black/60 p-2">
                                                <Play className="h-5 w-5 fill-white text-white" />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveVideo(id)}
                                            aria-label={t('createCraft.removeVideo')}
                                            className="absolute right-1 top-1 rounded-full p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                            style={{ backgroundColor: 'oklch(0.08 0.01 250 / 0.6)' }}
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
                                placeholder={t('createCraft.youtubePlaceholder')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAddVideo()
                                    }
                                }}
                            />
                            <Button type="button" variant="outline" onClick={handleAddVideo}>
                                {t('createCraft.addVideo')}
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                            {isSubmitting
                                ? isCreateMode
                                    ? t('createCraft.savingCraft')
                                    : t('createCraft.updatingCraft')
                                : isCreateMode
                                  ? t('createCraft.saveCraft')
                                  : t('createCraft.updateCraft')}
                        </Button>
                        {!isCreateMode && (
                            <Button variant="outline" onClick={handleCancelEdit}>
                                {t('createCraft.cancelEdit')}
                            </Button>
                        )}
                        {!isCreateMode && (
                            <Button variant="destructive" onClick={handleDelete}>
                                {t('createCraft.deleteCraft')}
                            </Button>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
