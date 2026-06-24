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
}: {
    src?: string | null
    alt: string
    fallback: ReactNode
    sizes?: string
    className?: string
    priority?: boolean
}) {
    if (!src) return <>{fallback}</>
    return (
        <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            priority={priority}
            sizes={sizes}
            className={`object-cover ${className ?? ''}`}
        />
    )
}
