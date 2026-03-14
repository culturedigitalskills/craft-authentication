'use client'

import { useCallback, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface GalleryLightboxProps {
    images: { mediaId: string; url: string }[]
    currentIndex: number
    onClose: () => void
    onNavigate: (index: number) => void
}

export function GalleryLightbox({ images, currentIndex, onClose, onNavigate }: GalleryLightboxProps) {
    const hasPrev = currentIndex > 0
    const hasNext = currentIndex < images.length - 1

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
        if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
        if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
    }, [onClose, onNavigate, currentIndex, hasPrev, hasNext])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''
        }
    }, [handleKeyDown])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
                <X className="h-6 w-6" />
            </button>

            {hasPrev && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1) }}
                    className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                >
                    <ChevronLeft className="h-8 w-8" />
                </button>
            )}

            <div
                className="relative max-h-[85vh] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
            >
                <Image
                    src={images[currentIndex].url}
                    alt={`Gallery photo ${currentIndex + 1}`}
                    width={1200}
                    height={900}
                    className="max-h-[85vh] w-auto rounded-lg object-contain"
                />
            </div>

            {hasNext && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1) }}
                    className="absolute right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                >
                    <ChevronRight className="h-8 w-8" />
                </button>
            )}

            <div className="absolute bottom-4 text-sm text-white/60">
                {currentIndex + 1} / {images.length}
            </div>
        </div>
    )
}
