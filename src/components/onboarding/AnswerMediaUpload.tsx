'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { CaptionedVideo } from '@/components/shared/CaptionedVideo'
import { Loader2, Mic, Video, Trash2 } from 'lucide-react'
import { MAX_VIDEO_MB, prepareFileForUpload } from '@/lib/media-limits'

interface AnswerMediaUploadProps {
    mediaId: string | null
    onChange: (mediaId: string | null) => void
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
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [mimeType, setMimeType] = useState<string | null>(initialMimeType)

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
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
            if (!res.ok) throw new Error('Upload failed')
            const media = await res.json()
            setMimeType(media.mimeType ?? file.type)
            onChange(media.id)
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
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mic className="h-4 w-4" />
                <Video className="h-4 w-4" />
                <span>{t('label')}</span>
            </div>

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
                            {t('uploading')}
                        </>
                    ) : mediaUrl ? (
                        t('replace')
                    ) : (
                        t('chooseFile')
                    )}
                </Button>
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
        </div>
    )
}
