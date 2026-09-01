'use client'

import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { CaptionedVideo } from '@/components/shared/CaptionedVideo'
import { MAX_IMAGE_MB, MAX_VIDEO_MB, prepareFileForUpload } from '@/lib/media-limits'
import { uploadWithProgress } from '@/lib/upload'

export interface WorkshopMedia {
    attachmentId: string
    mediaId: string
    url: string
    isVideo: boolean
}

interface StoryWorkshopUploadProps {
    storyId: string
    // Controlled by the wizard so uploads survive stepping away and back — the
    // step subtree remounts on navigation, which would otherwise reset local state.
    items: WorkshopMedia[]
    onItemsChange: Dispatch<SetStateAction<WorkshopMedia[]>>
    // mediaId -> transcript status; READY videos get a captions track.
    captionStatuses?: Record<string, string>
    // Uploads enqueue caption jobs server-side — lets the wizard refresh statuses.
    onUploaded?: () => void
}

export function StoryWorkshopUpload({
    storyId,
    items,
    onItemsChange,
    captionStatuses = {},
    onUploaded,
}: StoryWorkshopUploadProps) {
    const t = useTranslations('craftStory.workshop')
    const tStory = useTranslations('craftStory')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    // Reorder bookkeeping: the order the artisan last asked for, the order the
    // server has confirmed, and whether a request is currently out.
    const latestOrderRef = useRef<string[] | null>(null)
    const serverOrderRef = useRef<string[]>(items.map((i) => i.attachmentId))
    const reorderInFlightRef = useRef(false)

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? [])
        if (files.length === 0) return

        setError(null)

        // Validate (and downscale images) up front so nothing uploads when a
        // file in the batch is over the limit.
        const prepared = await Promise.all(files.map(prepareFileForUpload))
        const rejected = prepared.find((p) => !p.ok)
        if (rejected && !rejected.ok) {
            setError(
                rejected.reason === 'videoTooLarge'
                    ? t('videoTooLarge', { max: rejected.maxMb })
                    : t('imageTooLarge', { max: rejected.maxMb }),
            )
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }
        const readyFiles = prepared.flatMap((p) => (p.ok ? [p.file] : []))

        setIsUploading(true)
        setProgress(0)
        const perFilePct = new Array(readyFiles.length).fill(0)
        try {
            // Upload and attach in parallel; failures don't block the rest.
            const results = await Promise.allSettled(
                readyFiles.map(async (file, i) => {
                    const outcome = await uploadWithProgress(file, (pct) => {
                        perFilePct[i] = pct
                        setProgress(Math.round(perFilePct.reduce((a, b) => a + b, 0) / perFilePct.length))
                    })
                    if (!outcome.ok) throw new Error(outcome.error || 'Upload failed')

                    const attachRes = await fetch('/api/media/attachments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mediaId: outcome.media.id,
                            entityType: 'CraftStory',
                            entityId: storyId,
                            attachmentType: 'PROCESS',
                            displayOrder: items.length + i,
                        }),
                    })
                    if (!attachRes.ok) {
                        const attachError = await attachRes.json().catch(() => ({}))
                        throw new Error(attachError.error || 'Attachment failed')
                    }
                    const attachment = await attachRes.json()
                    return {
                        attachmentId: attachment.id as string,
                        mediaId: outcome.media.id,
                        url: `/api/media/${outcome.media.id}`,
                        isVideo: (outcome.media.mimeType ?? '').startsWith('video/'),
                    }
                }),
            )

            const uploaded = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
            if (uploaded.length > 0) {
                onItemsChange((prev) => [...prev, ...uploaded])
                // The server appended these at the end, so record them as part
                // of the confirmed order; a later reorder rollback keeps them.
                serverOrderRef.current = [
                    ...serverOrderRef.current,
                    ...uploaded.map((u) => u.attachmentId),
                ]
            }

            const firstFailure = results.find((r) => r.status === 'rejected')
            if (firstFailure && firstFailure.status === 'rejected') {
                const reason = firstFailure.reason
                setError(reason instanceof Error && reason.message ? reason.message : t('uploadFailed'))
            }
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
            onUploaded?.()
        }
    }

    /**
     * Move an item one place earlier or later.
     *
     * The grid updates immediately and the whole new sequence is sent, so the
     * server never sees a half-applied order. Requests are single-flight with
     * last-wins: firing one per click let two quick clicks arrive out of order
     * and leave the database in an arrangement the grid never showed.
     */
    function handleMove(index: number, direction: -1 | 1) {
        const target = index + direction
        if (target < 0 || target >= items.length) return

        const reordered = [...items]
        ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
        onItemsChange(reordered)
        setError(null)

        latestOrderRef.current = reordered.map((i) => i.attachmentId)
        void syncOrder()
    }

    async function syncOrder() {
        if (reorderInFlightRef.current) return
        reorderInFlightRef.current = true
        try {
            // Re-check after each round trip: clicks made while a request was in
            // flight collapse into a single trailing request for the final order.
            while (
                latestOrderRef.current &&
                latestOrderRef.current.join() !== serverOrderRef.current.join()
            ) {
                const attempt = latestOrderRef.current
                const res = await fetch('/api/media/attachments', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        entityType: 'CraftStory',
                        entityId: storyId,
                        orderedAttachmentIds: attempt,
                    }),
                })
                if (!res.ok) throw new Error('Reorder failed')
                serverOrderRef.current = attempt
            }
        } catch {
            // Fall back to the last order the server confirmed. Rebuilt from the
            // current items rather than a snapshot, so anything uploaded while
            // the request was in flight survives the rollback.
            const confirmed = serverOrderRef.current
            onItemsChange((current) => {
                const rank = new Map(confirmed.map((id, i) => [id, i]))
                return [...current].sort(
                    (a, b) =>
                        (rank.get(a.attachmentId) ?? Number.MAX_SAFE_INTEGER) -
                        (rank.get(b.attachmentId) ?? Number.MAX_SAFE_INTEGER),
                )
            })
            latestOrderRef.current = null
            setError(t('reorderFailed'))
        } finally {
            reorderInFlightRef.current = false
        }
    }

    async function handleRemove(item: WorkshopMedia) {
        try {
            const res = await fetch(`/api/media/${item.mediaId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Delete failed')
            onItemsChange((prev) => prev.filter((i) => i.mediaId !== item.mediaId))
        } catch {
            setError(t('deleteFailed'))
        }
    }

    return (
        <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((item, index) => (
                    <div
                        key={item.mediaId}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/30"
                    >
                        {item.isVideo ? (
                            <CaptionedVideo
                                src={item.url}
                                captionsSrc={
                                    captionStatuses[item.mediaId] === 'READY'
                                        ? `/api/media/${item.mediaId}/subtitles`
                                        : undefined
                                }
                                captionsLabel={tStory('captionsLabel')}
                                className="h-full w-full object-cover"
                                preload="metadata"
                            />
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

                        {/* Order controls stay visible rather than revealing on
                            hover: this is the primary way to arrange the film,
                            and touch devices have no hover. */}
                        {items.length > 1 && (
                            <>
                                <span
                                    className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white"
                                    aria-label={t('position', { index: index + 1, count: items.length })}
                                >
                                    {index + 1}
                                </span>
                                <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                                    <button
                                        type="button"
                                        onClick={() => handleMove(index, -1)}
                                        disabled={index === 0}
                                        className="rounded-full bg-black/60 p-1.5 text-white transition-opacity disabled:opacity-30"
                                        aria-label={t('moveEarlier')}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMove(index, 1)}
                                        disabled={index === items.length - 1}
                                        className="rounded-full bg-black/60 p-1.5 text-white transition-opacity disabled:opacity-30"
                                        aria-label={t('moveLater')}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </>
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
                        <div className="flex flex-col items-center gap-1">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-xs font-medium text-primary">{progress}%</span>
                        </div>
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

            <p className="mt-2 text-xs text-muted-foreground">
                {t('sizeHint', { imageMax: MAX_IMAGE_MB, videoMax: MAX_VIDEO_MB })}
            </p>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    )
}
