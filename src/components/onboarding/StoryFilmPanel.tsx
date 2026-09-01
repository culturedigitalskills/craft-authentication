'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { CaptionedVideo } from '@/components/shared/CaptionedVideo'
import { AlertCircle, Clapperboard, Download, Loader2, RefreshCw, Upload } from 'lucide-react'
import { prepareFileForUpload, MAX_VIDEO_MB } from '@/lib/media-limits'
import { uploadWithProgress } from '@/lib/upload'
import { measureMediaDuration } from '@/lib/media-duration'

type FilmStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED'
type FilmSource = 'RENDERED' | 'UPLOADED'

interface FilmView {
    status: FilmStatus
    source: FilmSource
    isPublic: boolean
    outputMediaId: string | null
    durationSec: number | null
    error: string | null
    updatedAt: string
}

export function StoryFilmPanel() {
    const t = useTranslations('craftStory.film')
    const tStory = useTranslations('craftStory')

    const [film, setFilm] = useState<FilmView | null>(null)
    const [stale, setStale] = useState(false)
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState<string | null>(null)
    const [open, setOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const refresh = useCallback(async () => {
        try {
            const res = await fetch('/api/artisans/me/story/film')
            if (!res.ok) return
            const data = await res.json()
            setFilm(data.film ?? null)
            setStale(Boolean(data.stale))
        } catch {
            // Status is informational — never surface fetch failures.
        }
    }, [])

    useEffect(() => {
        void refresh()
    }, [refresh])

    // Poll while a render is in flight so the panel flips to ready/failed.
    const active = film?.status === 'PENDING' || film?.status === 'PROCESSING'
    useEffect(() => {
        if (!active) return
        const id = setInterval(() => void refresh(), 8000)
        return () => clearInterval(id)
    }, [active, refresh])

    async function startRender(force: boolean) {
        setBusy(true)
        setNotice(null)
        try {
            const res = await fetch('/api/artisans/me/story/film', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(force ? { force: true } : {}),
            })
            if (res.status === 400) {
                setNotice(t('insufficientInputs'))
                return
            }
            if (!res.ok) {
                setNotice(t('failed'))
                return
            }
            const data = await res.json()
            setFilm(data.film ?? null)
            setStale(false)
        } catch {
            setNotice(t('failed'))
        } finally {
            setBusy(false)
        }
    }

    /**
     * Adopt a video the artisan already has as their film. The file goes through
     * the same upload endpoint as everything else, then PUT points the story's
     * film row at it.
     */
    async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (!file) return

        setNotice(null)

        const prepared = await prepareFileForUpload(file)
        if (!prepared.ok) {
            setNotice(t('uploadTooLarge', { max: MAX_VIDEO_MB }))
            return
        }

        setUploading(true)
        setProgress(0)
        try {
            const outcome = await uploadWithProgress(prepared.file, setProgress)
            if (!outcome.ok) {
                setNotice(outcome.status === 400 ? t('uploadWrongType') : t('uploadFailed'))
                return
            }

            // Display only; the server bounds it and computes nothing from it.
            const durationSec = await measureMediaDuration(
                'video',
                `/api/media/${outcome.media.id}`,
            )

            const res = await fetch('/api/artisans/me/story/film', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mediaId: outcome.media.id,
                    ...(durationSec > 0 ? { durationSec } : {}),
                }),
            })
            if (res.status === 409) {
                setNotice(t('uploadRenderBusy'))
                return
            }
            if (!res.ok) {
                setNotice(t('uploadFailed'))
                return
            }
            await refresh()
        } catch {
            setNotice(t('uploadFailed'))
        } finally {
            setUploading(false)
        }
    }

    async function togglePublish() {
        if (!film) return
        setBusy(true)
        try {
            const res = await fetch('/api/artisans/me/story/film', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic: !film.isPublic }),
            })
            if (res.ok) {
                const data = await res.json()
                setFilm(f => (f ? { ...f, isPublic: data.film.isPublic } : f))
            }
        } finally {
            setBusy(false)
        }
    }

    const isProcessing = film?.status === 'PENDING' || film?.status === 'PROCESSING'
    const isReady = film?.status === 'READY' && film.outputMediaId
    const isUploaded = film?.source === 'UPLOADED'

    // Offered whenever a render is not in flight: as an alternative to creating
    // a film, and afterwards as a way to replace one.
    const uploadControl = !isProcessing && (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleUpload}
            />
            <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || uploading}
            >
                {uploading ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                    <Upload className="mr-1.5 h-4 w-4" />
                )}
                {uploading
                    ? t('uploadProgress', { percent: progress })
                    : isReady
                      ? t('uploadReplace')
                      : t('uploadOwn')}
            </Button>
        </>
    )

    return (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-2 flex items-center gap-2">
                <Clapperboard className="h-5 w-5 text-warm" />
                <h3 className="text-sm font-semibold">{t('title')}</h3>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{t('description')}</p>

            {isProcessing && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('processing')}
                </p>
            )}

            {film?.status === 'FAILED' && (
                <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        {t('failed')}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => void startRender(false)} disabled={busy || uploading}>
                            <RefreshCw className="mr-1.5 h-4 w-4" />
                            {t('retry')}
                        </Button>
                        {/* A render that keeps failing should not trap the
                            artisan: their own film is a way through. */}
                        {uploadControl}
                    </div>
                </div>
            )}

            {isReady && (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" onClick={() => setOpen(true)}>
                            <Clapperboard className="mr-1.5 h-4 w-4" />
                            {t('watch')}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => void startRender(true)} disabled={busy || uploading}>
                            {busy ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-1.5 h-4 w-4" />
                            )}
                            {isUploaded ? t('generateInstead') : t('regenerate')}
                        </Button>
                        {uploadControl}
                        {film.isPublic && (
                            <span className="text-xs font-medium text-warm">{t('published')}</span>
                        )}
                    </div>
                    {isUploaded && (
                        <p className="text-xs text-muted-foreground">{t('uploadedBadge')}</p>
                    )}
                    {!film.isPublic && (
                        <p className="text-xs text-muted-foreground">{t('willBeHighlight')}</p>
                    )}
                    {stale && (
                        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {t('stale')}
                        </p>
                    )}
                </div>
            )}

            {!film && !isProcessing && (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" onClick={() => void startRender(false)} disabled={busy || uploading}>
                            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Clapperboard className="mr-1.5 h-4 w-4" />}
                            {t('create')}
                        </Button>
                        {uploadControl}
                    </div>
                    <p className="text-xs text-muted-foreground">{t('uploadHint')}</p>
                </div>
            )}

            {notice && <p className="mt-2 text-sm text-muted-foreground">{notice}</p>}

            {isReady && film.outputMediaId && (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{t('premiereTitle')}</DialogTitle>
                            <DialogDescription>{t('description')}</DialogDescription>
                        </DialogHeader>
                        <CaptionedVideo
                            src={`/api/media/${film.outputMediaId}`}
                            captionsSrc={`/api/media/${film.outputMediaId}/subtitles`}
                            captionsLabel={tStory('captionsLabel')}
                            className="w-full rounded-md bg-black"
                        />
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => void startRender(true)} disabled={busy}>
                                <RefreshCw className="mr-1.5 h-4 w-4" />
                                {t('regenerate')}
                            </Button>
                            <a
                                href={`/api/media/${film.outputMediaId}`}
                                download
                                className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                <Download className="mr-1.5 h-4 w-4" />
                                {t('download')}
                            </a>
                            {/* No separate "publish film" button — publishing the
                                story features a ready film. Only offer to hide it. */}
                            {film.isPublic && (
                                <Button type="button" variant="outline" size="sm" onClick={() => void togglePublish()} disabled={busy}>
                                    {t('unpublish')}
                                </Button>
                            )}
                        </div>
                        {!film.isPublic && (
                            <p className="text-xs text-muted-foreground">{t('willBeHighlight')}</p>
                        )}
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
