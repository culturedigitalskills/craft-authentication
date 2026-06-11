'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { GalleryLightbox } from './GalleryLightbox'
import { getClientC2PAState } from '@/lib/c2pa-client'
import type { C2PAState } from '@/types/c2pa'
import { Check, Play, Music } from 'lucide-react'
import { mediaKind } from '@/lib/media-kind'

interface GalleryImage {
    id: string
    mediaId: string
    url: string
    mimeType?: string | null
}

interface GalleryGridProps {
    images: GalleryImage[]
    artisanUserId?: string
}

export function GalleryGrid({ images, artisanUserId }: GalleryGridProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
    const [c2paStates, setC2paStates] = useState<Record<string, C2PAState>>({})

    useEffect(() => {
        if (!artisanUserId) return

        let active = true

        images.forEach(async (image) => {
            // C2PA manifests only apply to images
            if (mediaKind(image.mimeType) !== 'image') return
            try {
                const res = await fetch(image.url)
                if (!res.ok) return
                const blob = await res.blob()
                if (!active) return
                const file = new File([blob], `gallery_${image.mediaId}.png`, { type: blob.type })
                const state = await getClientC2PAState(file, artisanUserId)
                if (!active) return
                setC2paStates((prev) => ({ ...prev, [image.mediaId]: state }))
            } catch (err) {
                console.error('Failed to verify gallery image C2PA state:', err)
            }
        })

        return () => {
            active = false
        }
    }, [images, artisanUserId])

    return (
        <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image, index) => {
                    const kind = mediaKind(image.mimeType)
                    return (
                    <div
                        key={image.mediaId}
                        className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-border"
                        onClick={() => setLightboxIndex(index)}
                    >
                        {kind === 'image' && (
                            <Image
                                src={image.url}
                                alt="Gallery photo"
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                unoptimized
                                className="object-cover transition-transform group-hover:scale-105"
                            />
                        )}
                        {kind === 'video' && (
                            <>
                                <video
                                    src={image.url}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white">
                                        <Play className="h-6 w-6 translate-x-0.5 fill-current" />
                                    </div>
                                </div>
                            </>
                        )}
                        {kind === 'audio' && (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/50 text-muted-foreground">
                                <Music className="h-10 w-10" />
                                <span className="text-xs">Audio</span>
                            </div>
                        )}
                        {c2paStates[image.mediaId] === 'owned' && (
                            <div
                                className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md"
                                title="Owner verified via C2PA Content Credentials"
                                onClick={(e) => {
                                    // Prevent triggering lightbox when clicking on the verification badge
                                    e.stopPropagation()
                                }}
                            >
                                <Check className="h-4 w-4 stroke-[3]" />
                            </div>
                        )}
                    </div>
                    )
                })}
            </div>

            {lightboxIndex !== null && (
                <GalleryLightbox
                    images={images}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onNavigate={setLightboxIndex}
                />
            )}
        </>
    )
}
