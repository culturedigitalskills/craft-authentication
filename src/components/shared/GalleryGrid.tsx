'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { GalleryLightbox } from './GalleryLightbox'
import { getClientC2PAState } from '@/lib/c2pa-client'
import type { C2PAState } from '@/types/c2pa'
import { Check } from 'lucide-react'

interface GalleryImage {
    id: string
    mediaId: string
    url: string
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
                            unoptimized
                            className="object-cover transition-transform group-hover:scale-105"
                        />
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
                ))}
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
