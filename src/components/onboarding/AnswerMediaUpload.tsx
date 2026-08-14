'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { CaptionedVideo } from '@/components/shared/CaptionedVideo'
import { RecorderControl } from './RecorderControl'
import { Loader2, Mic, Video, Trash2 } from 'lucide-react'
import { MAX_VIDEO_MB, prepareFileForUpload } from '@/lib/media-limits'
import { uploadWithProgress } from '@/lib/upload'

interface AnswerMediaUploadProps {
    mediaId: string | null
    // Reports the mimeType alongside the id so the wizard can remember it and
    // still render a video (not audio) after the artisan navigates away and back.
    onChange: (mediaId: string | null, mimeType?: string | null) => void
    // Mime type of an already-saved answer, so a reloaded video renders as a
    // video player (fresh uploads set it locally from the file).
    initialMimeType?: string | null
    captionsReady?: boolean
}

export function AnswerMediaUpload({
    mediaId,
    onChange,
    initialMimeType = null,
    captionsReady = false,
}: AnswerMediaUploadProps) {
    const t = useTranslations('craftStory.uploader')
    const tStory = useTranslations('craftStory')
    const tRec = useTranslations('craftStory.recorder')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [mimeType, setMimeType] = useState<string | null>(initialMimeType)
    const [recorderMode, setRecorderMode] = useState<'audio' | 'video' | null>(null)
    // Detected after mount so SSR and first client render agree (navigator is
    // unavailable on the server); gates the in-browser record buttons.
    const [canRecord, setCanRecord] = useState(false)
    useEffect(() => {
        setCanRecord(
            typeof navigator !== 'undefined' &&
                !!navigator.mediaDevices?.getUserMedia &&
                typeof MediaRecorder !== 'undefined'
        )
    }, [])

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0]
        if (!selected) return

        const prepared = await prepareFileForUpload(selected)
        if (!prepared.ok) {
            setError(t('fileTooLarge', { max: prepared.maxMb }))
            e.target.value = ''
            return
        }
        const file = prepared.file

        setError(null)
        setIsUploading(true)
        setProgress(0)
        try {
            const outcome = await uploadWithProgress(file, setProgress)
            if (!outcome.ok) throw new Error(outcome.error || 'Upload failed')
            const resolvedMime = outcome.media.mimeType ?? file.type
            setMimeType(resolvedMime)
            onChange(outcome.media.id, resolvedMime)
        } catch {
            setError(t('uploadFailed'))
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const isVideo = (mimeType ?? '').startsWith('video/')
    const mediaUrl = mediaId ? `/api/media/${mediaId}` : null

    return (
        <div className="rounded-lg border border-dashed border-border bg-background/60 p-4">
            {recorderMode ? (
                <RecorderControl
                    mode={recorderMode}
                    onUploaded={(id, mime) => {
                        setMimeType(mime)
                        onChange(id, mime)
                        setRecorderMode(null)
                    }}
                    onCancel={() => setRecorderMode(null)}
                />
            ) : (
                <>
                    {mediaUrl && !isUploading && (
                        <div className="mb-3">
                            {isVideo ? (
                                <CaptionedVideo
                                    src={mediaUrl}
                                    captionsSrc={
                                        captionsReady && mediaId
                                            ? `/api/media/${mediaId}/subtitles`
                                            : undefined
                                    }
                                    captionsLabel={tStory('captionsLabel')}
                                    className="w-full max-h-64 rounded-md bg-black"
                                />
                            ) : (
                                <audio src={mediaUrl} controls className="w-full" />
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    {t('uploading')} {progress}%
                                </>
                            ) : mediaUrl ? (
                                t('replace')
                            ) : (
                                t('chooseFile')
                            )}
                        </Button>
                        {canRecord && !mediaUrl && !isUploading && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRecorderMode('audio')}
                                >
                                    <Mic className="mr-1.5 h-4 w-4" />
                                    {tRec('recordAudio')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRecorderMode('video')}
                                >
                                    <Video className="mr-1.5 h-4 w-4" />
                                    {tRec('recordVideo')}
                                </Button>
                            </>
                        )}
                        {mediaUrl && !isUploading && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    onChange(null)
                                    setMimeType(null)
                                }}
                            >
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                {t('remove')}
                            </Button>
                        )}
                        <p className="text-xs text-muted-foreground">{t('hint', { max: MAX_VIDEO_MB })}</p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*,video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
                </>
            )}
        </div>
    )
}
