'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { ImagePlus, Loader2 } from 'lucide-react'
import { MAX_IMAGE_MB, prepareFileForUpload } from '@/lib/media-limits'
import { uploadWithProgress } from '@/lib/upload'

interface GroupPhotoUploadProps {
    groupId: string
    currentUrl: string | null
    attachmentType: 'HERO' | 'COVER'
    label: string
    className?: string
}

export function GroupPhotoUpload({
    groupId,
    currentUrl,
    attachmentType,
    label,
    className = '',
}: GroupPhotoUploadProps) {
    const t = useTranslations('groups')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl)
    const [error, setError] = useState<string | null>(null)

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

        const localPreview = URL.createObjectURL(file)
        setPreviewUrl(localPreview)

        try {
            const outcome = await uploadWithProgress(file, setProgress)
            if (!outcome.ok) throw new Error(outcome.error || 'Upload failed')
            const mediaFile = outcome.media

            const attachRes = await fetch('/api/media/attachments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mediaId: mediaFile.id,
                    entityType: 'Group',
                    entityId: groupId,
                    attachmentType,
                    isPrimary: true,
                }),
            })
            if (!attachRes.ok) {
                const attachError = await attachRes.json().catch(() => ({}))
                throw new Error(attachError.error || 'Attachment failed')
            }

            setPreviewUrl(`/api/media/${mediaFile.id}`)
        } catch (err: any) {
            setError(err.message || t('saveFailed'))
            setPreviewUrl(currentUrl)
        } finally {
            setIsUploading(false)
            URL.revokeObjectURL(localPreview)
        }
    }

    const isCover = attachmentType === 'COVER'

    return (
        <div>
            <p className="mb-1.5 text-sm font-medium">{label}</p>
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`group relative overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-all hover:border-primary/40 hover:bg-muted/50 ${
                    isCover ? 'h-40 w-full' : 'h-28 w-28'
                } ${className}`}
            >
                {previewUrl ? (
                    <Image
                        src={previewUrl}
                        alt={label}
                        fill
                        sizes={isCover ? '100vw' : '112px'}
                        className={isCover ? 'object-cover' : 'object-cover rounded-lg'}
                        unoptimized
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Upload</p>
                    </div>
                )}
                {isUploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/60">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs font-medium text-primary">{progress}%</span>
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
            <p className="mt-1.5 text-xs text-muted-foreground">
                {t('imageLimitHint', { max: MAX_IMAGE_MB })}
            </p>
            {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
        </div>
    )
}
