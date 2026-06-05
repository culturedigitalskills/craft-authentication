'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { ImagePlus, Loader2 } from 'lucide-react'

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
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl)
    const [error, setError] = useState<string | null>(null)

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 8 * 1024 * 1024) {
            setError(t('fileTooLarge'))
            e.target.value = ''
            return
        }

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

            const mediaFile = await uploadRes.json()

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
            if (!attachRes.ok) throw new Error('Attachment failed')

            setPreviewUrl(`/api/media/${mediaFile.id}`)
        } catch {
            setError(t('saveFailed'))
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
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Upload</p>
                    </div>
                )}
                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
            {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
        </div>
    )
}
