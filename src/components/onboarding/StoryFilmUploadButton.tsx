'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { prepareFileForUpload, MAX_VIDEO_MB } from '@/lib/media-limits'
import { uploadWithProgress } from '@/lib/upload'
import { measureMediaDuration } from '@/lib/media-duration'
import { PLAYABLE_FILM_MIME_TYPES, resolveMimeType } from '@/lib/validations/media'

/**
 * Adopt a video the artisan already has as their story film.
 *
 * Shared by the wizard's opening step, where it is the alternative to answering
 * the questions at all, and by the film panel at the end, where it replaces a
 * generated film. The two entry points differ only in wording and in whether a
 * story row has to be created first.
 */
export function StoryFilmUploadButton({
    label,
    variant = 'outline',
    disabled = false,
    onBeforeUpload,
    onUploaded,
}: {
    label: string
    variant?: 'default' | 'outline'
    disabled?: boolean
    /** Runs before the upload; return false to abort (e.g. the save failed). */
    onBeforeUpload?: () => Promise<boolean>
    onUploaded: () => void | Promise<void>
}) {
    const t = useTranslations('craftStory.film')
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)

    async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (inputRef.current) inputRef.current.value = ''
        if (!file) return

        setError(null)

        // Checked here as well as on the server, because the alternative is
        // uploading the whole file only to have it refused, which wastes the
        // artisan's time and bandwidth and leaves the stored file orphaned. The
        // same resolver the server uses, so the two cannot disagree.
        if (!PLAYABLE_FILM_MIME_TYPES.includes(resolveMimeType(file.name, file.type))) {
            setError(t('uploadWrongType'))
            return
        }

        const prepared = await prepareFileForUpload(file)
        if (!prepared.ok) {
            setError(t('uploadTooLarge', { max: MAX_VIDEO_MB }))
            return
        }

        setUploading(true)
        setProgress(0)
        try {
            // The story has to exist before it can own a film.
            if (onBeforeUpload && !(await onBeforeUpload())) return

            const outcome = await uploadWithProgress(prepared.file, setProgress)
            if (!outcome.ok) {
                setError(outcome.status === 400 ? t('uploadWrongType') : t('uploadFailed'))
                return
            }

            // Display only; the server bounds it and computes nothing from it.
            const durationSec = await measureMediaDuration('video', `/api/media/${outcome.media.id}`)

            const res = await fetch('/api/artisans/me/story/film', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mediaId: outcome.media.id,
                    ...(durationSec > 0 ? { durationSec } : {}),
                }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                // The film was refused after the file was already stored, so
                // clear it rather than leaving an upload nothing points at.
                await fetch(`/api/media/${outcome.media.id}`, { method: 'DELETE' }).catch(() => {})

                if (res.status === 409) setError(t('uploadRenderBusy'))
                else if (body?.error === 'UNPLAYABLE_FORMAT') setError(t('uploadWrongType'))
                else setError(t('uploadFailed'))
                return
            }
            await onUploaded()
        } catch {
            setError(t('uploadFailed'))
        } finally {
            setUploading(false)
        }
    }

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFile}
            />
            <Button
                type="button"
                size="sm"
                variant={variant}
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading}
            >
                {uploading ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                    <Upload className="mr-1.5 h-4 w-4" />
                )}
                {uploading ? t('uploadProgress', { percent: progress }) : label}
            </Button>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </>
    )
}
