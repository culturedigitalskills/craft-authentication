import type { ReactNode } from 'react'
import Image from 'next/image'

/**
 * Image slot for the design system: renders the real photo with
 * object-fit:cover when `src` is present, otherwise the supplied on-brand
 * fallback (see ./fallbacks). The parent must be `position: relative`.
 */
export function ScMedia({
    src,
    alt,
    fallback,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    className,
    priority,
    unoptimized,
}: {
    src?: string | null
    alt: string
    fallback: ReactNode
    sizes?: string
    className?: string
    priority?: boolean
    /**
     * Set when the photo is only served to the person viewing it. Next's
     * optimizer refetches server side with no cookies, so authorized media
     * 404s for it and the slot renders broken rather than falling back.
     */
    unoptimized?: boolean
}) {
    if (!src) return <>{fallback}</>
    return (
        <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            unoptimized={unoptimized}
            className={`object-cover ${className ?? ''}`}
        />
    )
}
