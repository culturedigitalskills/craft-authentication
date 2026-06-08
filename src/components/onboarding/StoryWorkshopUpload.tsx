'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ImagePlus, Loader2, Trash2, FileVideo } from 'lucide-react'
import Image from 'next/image'

export interface WorkshopMedia {
    attachmentId: string
    mediaId: string
    url: string
    isVideo: boolean
}

interface StoryWorkshopUploadProps {
    storyId: string
    initialItems: WorkshopMedia[]
    maxUploadMb: number
}

export function StoryWorkshopUpload({ storyId, initialItems, maxUploadMb }: StoryWorkshopUploadProps) {
    void maxUploadMb // reserved for future per-file client-side size check
    const t = useTranslations('craftStory.workshop')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [items, setItems] = useState<WorkshopMedia[]>(initialItems)
    const [error, setError] = useState<string | null>(null)

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? [])
        if (files.length === 0) return

        setError(null)
        setIsUploading(true)

        try {
            for (const file of files) {
                const formData = new FormData()
                formData.append('file', file)
                const uploadRes = await fetch('/api/media/upload', { method: 'POST', body: formData })
                if (!uploadRes.ok) {
                    const errorData = await uploadRes.json().catch(() => ({}))
                    throw new Error(errorData.error || 'Upload failed')
                }
                const mediaFile = await uploadRes.json()

                const attachRes = await fetch('/api/media/attachments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mediaId: mediaFile.id,
                        entityType: 'CraftStory',
                        entityId: storyId,
                        attachmentType: 'PROCESS',
                        displayOrder: items.length,
                    }),
                })
                if (!attachRes.ok) {
                    const attachError = await attachRes.json().catch(() => ({}))
                    throw new Error(attachError.error || 'Attachment failed')
                }
                const attachment = await attachRes.json()

                setItems(prev => [
                    ...prev,
                    {
                        attachmentId: attachment.id,
                        mediaId: mediaFile.id,
                        url: `/api/media/${mediaFile.id}`,
                        isVideo: (mediaFile.mimeType ?? '').startsWith('video/'),
                    },
                ])
            }
        } catch (err: any) {
            setError(err.message || t('uploadFailed'))
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    async function handleRemove(item: WorkshopMedia) {
        try {
            const res = await fetch(`/api/media/${item.mediaId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Delete failed')
            setItems(prev => prev.filter(i => i.mediaId !== item.mediaId))
        } catch {
            setError(t('deleteFailed'))
        }
    }

    return (
        <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map(item => (
                    <div
                        key={item.mediaId}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/30"
                    >
                        {item.isVideo ? (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                                <FileVideo className="h-8 w-8" />
                                <span className="text-xs">{t('videoLabel')}</span>
                            </div>
                        ) : (
                            <Image
                                src={item.url}
                                alt={t('itemAlt')}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover"
                            />
                        )}
                        <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            aria-label={t('removeItem')}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
                            <span className="text-xs text-muted-foreground">{t('addFile')}</span>
                        </div>
                    )}
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />

            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    )
}
