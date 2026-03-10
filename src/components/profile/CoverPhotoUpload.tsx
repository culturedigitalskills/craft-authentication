'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { ImagePlus, Loader2 } from 'lucide-react'

interface CoverPhotoUploadProps {
    artisanId: string | null
    currentCoverUrl: string | null
    onCoverUploaded: (mediaFileId: string) => void
}

export function CoverPhotoUpload({
    artisanId,
    currentCoverUrl,
    onCoverUploaded,
}: CoverPhotoUploadProps) {
    const t = useTranslations('profile')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentCoverUrl)
    const [error, setError] = useState<string | null>(null)

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)
        setIsUploading(true)

        const localPreview = URL.createObjectURL(file)
        setPreviewUrl(localPreview)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const uploadRes = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData,
            })

            if (!uploadRes.ok) throw new Error('Upload failed')

            const { file: mediaFile } = await uploadRes.json()

            if (artisanId) {
                const attachRes = await fetch('/api/media/attachments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mediaId: mediaFile.id,
                        entityType: 'Artisan',
                        entityId: artisanId,
                        attachmentType: 'COVER',
                        isPrimary: true,
                    }),
                })

                if (!attachRes.ok) throw new Error('Attachment failed')
            }

            onCoverUploaded(mediaFile.id)
            setPreviewUrl(`/api/media/${mediaFile.id}`)
        } catch {
            setError(t('coverUploadFailed'))
            setPreviewUrl(currentCoverUrl)
        } finally {
            setIsUploading(false)
            URL.revokeObjectURL(localPreview)
        }
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="relative h-40 w-full overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-all hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                {previewUrl ? (
                    <Image
                        src={previewUrl}
                        alt="Cover photo"
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{t('uploadCover')}</p>
                    </div>
                )}
                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                {previewUrl && !isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/30">
                        <span className="rounded-md bg-background/80 px-3 py-1.5 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100">
                            {t('changeCover')}
                        </span>
                    </div>
                )}
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
            />
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    )
}
