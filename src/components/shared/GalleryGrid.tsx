'use client'

import { useState } from 'react'
import Image from 'next/image'
import { GalleryLightbox } from './GalleryLightbox'

interface GalleryImage {
    id: string
    mediaId: string
    url: string
}

interface GalleryGridProps {
    images: GalleryImage[]
}

export function GalleryGrid({ images }: GalleryGridProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

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
