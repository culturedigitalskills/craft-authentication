'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Camera, Loader2 } from 'lucide-react'

interface ProfilePhotoUploadProps {
    artisanId: string | null
    currentPhotoUrl: string | null
    onPhotoUploaded: (mediaFileId: string) => void
}

export function ProfilePhotoUpload({
    artisanId,
    currentPhotoUrl,
    onPhotoUploaded,
}: ProfilePhotoUploadProps) {
    const t = useTranslations('profile')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl)
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

        // Show preview immediately
        const localPreview = URL.createObjectURL(file)
        setPreviewUrl(localPreview)

        try {
            // Upload the file
            const formData = new FormData()
            formData.append('file', file)

            const uploadRes = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData,
            })

            if (!uploadRes.ok) {
                const errorData = await uploadRes.json().catch(() => ({}))
                throw new Error(errorData.error || 'Upload failed')
            }

            const mediaFile = await uploadRes.json()

            // If artisan already exists, create the attachment now
            if (artisanId) {
                const attachRes = await fetch('/api/media/attachments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mediaId: mediaFile.id,
                        entityType: 'Artisan',
                        entityId: artisanId,
                        attachmentType: 'HERO',
                        isPrimary: true,
                    }),
                })

                if (!attachRes.ok) {
                    const attachError = await attachRes.json().catch(() => ({}))
                    throw new Error(attachError.error || 'Attachment failed')
                }
            }

            onPhotoUploaded(mediaFile.id)
            setPreviewUrl(`/api/media/${mediaFile.id}`)
        } catch (err: any) {
            setError(err.message || t('photoUploadFailed'))
            setPreviewUrl(currentPhotoUrl)
        } finally {
            setIsUploading(false)
            URL.revokeObjectURL(localPreview)
        }
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-muted bg-muted/30 shadow-sm transition-all hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                {previewUrl ? (
                    <Image
                        src={previewUrl}
                        alt="Profile photo"
                        fill
                        sizes="128px"
                        className="object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <Camera className="h-10 w-10 text-muted-foreground" />
                    </div>
                )}
                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <p className="text-sm text-muted-foreground">
                {isUploading
                    ? t('photoUploading')
                    : previewUrl
                      ? t('changePhoto')
                      : t('uploadPhoto')}
            </p>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    )
}
