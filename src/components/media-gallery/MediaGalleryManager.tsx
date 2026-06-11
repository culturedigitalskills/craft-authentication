'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Loader2, X, Eye, EyeOff, Play, Music, Upload } from 'lucide-react'
import { GalleryLightbox } from '@/components/shared/GalleryLightbox'
import { mediaKind } from '@/lib/media-kind'

interface MediaItem {
    attachmentId: string
    mediaId: string
    url: string
    mimeType: string | null
    isPublic: boolean
}

interface MediaGalleryManagerProps {
    artisanId: string
    initialItems: MediaItem[]
}

export function MediaGalleryManager({ artisanId, initialItems }: MediaGalleryManagerProps) {
    const t = useTranslations('mediaGallery')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [items, setItems] = useState<MediaItem[]>(initialItems)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [busy, setBusy] = useState<string | null>(null)

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
                    const d = await uploadRes.json().catch(() => ({}))
                    throw new Error(d.error || t('uploadFailed'))
                }
                const mediaFile = await uploadRes.json()

                const attachRes = await fetch('/api/media/attachments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mediaId: mediaFile.id,
                        entityType: 'Artisan',
                        entityId: artisanId,
                        attachmentType: 'GALLERY',
                        isPublic: true,
                        displayOrder: items.length,
                    }),
                })
                if (!attachRes.ok) {
                    const d = await attachRes.json().catch(() => ({}))
                    throw new Error(d.error || t('uploadFailed'))
                }
                const attachment = await attachRes.json()
                setItems((prev) => [
                    ...prev,
                    {
                        attachmentId: attachment.id,
                        mediaId: mediaFile.id,
                        url: `/api/media/${mediaFile.id}`,
                        mimeType: mediaFile.mimeType ?? null,
                        isPublic: true,
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

    async function toggleVisibility(item: MediaItem) {
        setBusy(item.mediaId)
        setError(null)
        try {
            const res = await fetch(`/api/media/attachments/${item.attachmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic: !item.isPublic }),
            })
            if (!res.ok) throw new Error()
            setItems((prev) =>
                prev.map((i) => (i.mediaId === item.mediaId ? { ...i, isPublic: !i.isPublic } : i)),
            )
        } catch {
            setError(t('visibilityFailed'))
        } finally {
            setBusy(null)
        }
    }

    async function handleRemove(item: MediaItem) {
        if (confirmDelete !== item.mediaId) {
            setConfirmDelete(item.mediaId)
            return
        }
        setConfirmDelete(null)
        setBusy(item.mediaId)
        setError(null)
        try {
            const res = await fetch(`/api/media/${item.mediaId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            setItems((prev) => prev.filter((i) => i.mediaId !== item.mediaId))
        } catch {
            setError(t('deleteFailed'))
        } finally {
            setBusy(null)
        }
    }

    return (
        <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item, index) => {
                    const kind = mediaKind(item.mimeType)
                    return (
                        <div
                            key={item.mediaId}
                            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-border bg-muted"
                            onClick={() => setLightboxIndex(index)}
                        >
                            {kind === 'image' && (
                                <Image
                                    src={item.url}
                                    alt="Gallery item"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    unoptimized
                                    className="object-cover transition-transform group-hover:scale-105"
                                />
                            )}
                            {kind === 'video' && (
                                <>
                                    <video
                                        src={item.url}
                                        muted
                                        playsInline
                                        preload="metadata"
                                        className="h-full w-full object-cover"
                                    />
                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white">
                                            <Play className="h-6 w-6 translate-x-0.5 fill-current" />
                                        </div>
                                    </div>
                                </>
                            )}
                            {kind === 'audio' && (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/40 text-muted-foreground">
                                    <Music className="h-10 w-10" />
                                    <span className="text-xs">{t('audio')}</span>
                                </div>
                            )}

                            {/* Private badge */}
                            {!item.isPublic && (
                                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                                    <EyeOff className="h-3 w-3" />
                                    {t('private')}
                                </span>
                            )}

                            {/* Delete confirm overlay */}
                            {confirmDelete === item.mediaId ? (
                                <div
                                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 text-center"
                                    style={{ backgroundColor: 'oklch(0.08 0.01 250 / 0.78)' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <p className="text-sm font-medium text-white">{t('deleteConfirm')}</p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(item)}
                                            className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                                        >
                                            {t('deleteYes')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDelete(null)}
                                            className="rounded-md bg-white/20 px-3 py-1 text-sm font-medium text-white hover:bg-white/30"
                                        >
                                            {t('deleteNo')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Hover toolbar: visibility toggle + remove */
                                <div
                                    className="absolute right-1.5 top-1.5 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        type="button"
                                        disabled={busy === item.mediaId}
                                        onClick={() => toggleVisibility(item)}
                                        title={item.isPublic ? t('makePrivate') : t('makePublic')}
                                        aria-label={item.isPublic ? t('makePrivate') : t('makePublic')}
                                        className="rounded-full p-1.5 text-white disabled:opacity-50"
                                        style={{ backgroundColor: 'oklch(0.08 0.01 250 / 0.6)' }}
                                    >
                                        {busy === item.mediaId ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : item.isPublic ? (
                                            <Eye className="h-4 w-4" />
                                        ) : (
                                            <EyeOff className="h-4 w-4" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(item)}
                                        title={t('remove')}
                                        aria-label={t('remove')}
                                        className="rounded-full p-1.5 text-white"
                                        style={{ backgroundColor: 'oklch(0.08 0.01 250 / 0.6)' }}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Upload tile */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-center transition-all hover:border-warm/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-warm" />
                    ) : (
                        <>
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">{t('addMedia')}</span>
                            <span className="text-[10px] text-muted-foreground/70">{t('uploadHint')}</span>
                        </>
                    )}
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />

            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

            {lightboxIndex !== null && (
                <GalleryLightbox
                    images={items}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onNavigate={setLightboxIndex}
                />
            )}
        </div>
    )
}
