'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { GalleryLightbox } from '@/components/shared/GalleryLightbox'

interface GalleryImage {
    id: string
    mediaId: string
    url: string
}

interface GalleryUploadProps {
    artisanId: string | null
    initialImages: GalleryImage[]
    onGalleryUploaded?: (mediaFileIds: string[]) => void
}

export function GalleryUpload({
    artisanId,
    initialImages,
    onGalleryUploaded,
}: GalleryUploadProps) {
    const t = useTranslations('profile')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [images, setImages] = useState<GalleryImage[]>(initialImages)
    const [pendingIds, setPendingIds] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? [])
        if (files.length === 0) return

        setError(null)
        setIsUploading(true)

        try {
            for (const file of files) {
                const formData = new FormData()
                formData.append('file', file)

                const uploadRes = await fetch('/api/media/upload', {
                    method: 'POST',
                    body: formData,
                })

                if (!uploadRes.ok) throw new Error('Upload failed')

                const mediaFile = await uploadRes.json()

                if (artisanId) {
                    const attachRes = await fetch('/api/media/attachments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mediaId: mediaFile.id,
                            entityType: 'Artisan',
                            entityId: artisanId,
                            attachmentType: 'GALLERY',
                            isPrimary: false,
                            displayOrder: images.length,
                        }),
                    })

                    if (!attachRes.ok) throw new Error('Attachment failed')

                    const attachment = await attachRes.json()
                    setImages(prev => [...prev, {
                        id: attachment.id,
                        mediaId: mediaFile.id,
                        url: `/api/media/${mediaFile.id}`,
                    }])
                } else {
                    setPendingIds(prev => [...prev, mediaFile.id])
                    setImages(prev => [...prev, {
                        id: mediaFile.id,
                        mediaId: mediaFile.id,
                        url: `/api/media/${mediaFile.id}`,
                    }])
                    onGalleryUploaded?.([...pendingIds, mediaFile.id])
                }
            }
        } catch {
            setError(t('galleryUploadFailed'))
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    async function handleRemove(image: GalleryImage) {
        if (confirmDelete !== image.mediaId) {
            setConfirmDelete(image.mediaId)
            return
        }
        setConfirmDelete(null)
        try {
            const res = await fetch(`/api/media/${image.mediaId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Delete failed')
            setImages(prev => prev.filter(img => img.mediaId !== image.mediaId))
        } catch {
            setError(t('galleryDeleteFailed'))
        }
    }

    return (
        <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image, index) => (
                    <div
                        key={image.mediaId}
                        className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-border"
                        onClick={() => setLightboxIndex(index)}
                    >
                        <Image
                            src={image.url}
                            alt="Gallery photo"
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-cover transition-transform group-hover:scale-105"
                        />
                        {artisanId && confirmDelete === image.mediaId ? (
                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <p className="text-sm font-medium text-white">{t('galleryDeleteConfirm')}</p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(image)}
                                        className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                                    >
                                        {t('galleryDeleteYes')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(null)}
                                        className="rounded-md bg-white/20 px-3 py-1 text-sm font-medium text-white hover:bg-white/30"
                                    >
                                        {t('galleryDeleteNo')}
                                    </button>
                                </div>
                            </div>
                        ) : artisanId && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemove(image) }}
                                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-all hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : (
                        <div className="flex flex-col items-center gap-1.5">
                            <ImagePlus className="h-8 w-8 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{t('uploadGallery')}</span>
                        </div>
                    )}
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

            {lightboxIndex !== null && (
                <GalleryLightbox
                    images={images}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onNavigate={setLightboxIndex}
                />
            )}
        </div>
    )
}
