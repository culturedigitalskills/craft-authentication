'use client'

import { useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface GalleryLightboxProps {
    images: { mediaId: string; url: string }[]
    currentIndex: number
    onClose: () => void
    onNavigate: (index: number) => void
}

export function GalleryLightbox({
    images,
    currentIndex,
    onClose,
    onNavigate,
}: GalleryLightboxProps) {
    const hasPrev = currentIndex > 0
    const hasNext = currentIndex < images.length - 1
    const dialogRef = useRef<HTMLDivElement>(null)
    const previousFocusRef = useRef<HTMLElement | null>(null)

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
            if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
        },
        [onClose, onNavigate, currentIndex, hasPrev, hasNext],
    )

    useEffect(() => {
        // Store the previously focused element to restore on close
        previousFocusRef.current = document.activeElement as HTMLElement | null

        document.addEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'hidden'

        // Focus the dialog container
        dialogRef.current?.focus()

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''

            // Restore focus to the element that opened the lightbox
            previousFocusRef.current?.focus()
        }
    }, [handleKeyDown])

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Gallery image ${currentIndex + 1} of ${images.length}`}
            tabIndex={-1}
            className="fixed inset-0 z-50 flex items-center justify-center outline-none"
            style={{ backgroundColor: 'oklch(0.08 0.01 250 / 0.9)' }}
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="Close gallery"
                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
                <X className="h-6 w-6" />
            </button>

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    onNavigate(currentIndex - 1)
                }}
                disabled={!hasPrev}
                aria-label="Previous image"
                className={`absolute left-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 ${
                    !hasPrev ? 'invisible' : ''
                }`}
            >
                <ChevronLeft className="h-8 w-8" />
            </button>

            <div
                className="relative max-h-[85vh] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
            >
                <Image
                    src={images[currentIndex].url}
                    alt={`Gallery photo ${currentIndex + 1} of ${images.length}`}
                    width={1200}
                    height={900}
                    unoptimized
                    className="max-h-[85vh] w-auto rounded-lg object-contain"
                />
            </div>

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    onNavigate(currentIndex + 1)
                }}
                disabled={!hasNext}
                aria-label="Next image"
                className={`absolute right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 ${
                    !hasNext ? 'invisible' : ''
                }`}
            >
                <ChevronRight className="h-8 w-8" />
            </button>

            <div className="absolute bottom-4 text-sm text-white/60" aria-live="polite">
                {currentIndex + 1} / {images.length}
            </div>
        </div>
    )
}
