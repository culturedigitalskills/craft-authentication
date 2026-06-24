import type { ReactNode } from 'react'

/**
 * In-content section header: `title · rule · action`.
 * The signature divider used inside detail pages (e.g. "Related crafts ——— View all").
 */
export function SectionHeader({
    title,
    action,
    className,
}: {
    title: ReactNode
    action?: ReactNode
    className?: string
}) {
    return (
        <div className={`flex items-center gap-4 ${className ?? ''}`}>
            <h2 className="sc-h2 shrink-0">{title}</h2>
            <span className="sc-rule" />
            {action && <div className="shrink-0">{action}</div>}
        </div>
    )
}

/**
 * Gallery / listing page hero: eyebrow → big display title → one body line.
 * The shared header at the top of every listing page.
 */
export function GalleryHeader({
    eyebrow,
    title,
    description,
    className,
}: {
    eyebrow?: ReactNode
    title: ReactNode
    description?: ReactNode
    className?: string
}) {
    return (
        <div className={`mb-8 ${className ?? ''}`}>
            {eyebrow && <p className="sc-eyebrow mb-3">{eyebrow}</p>}
            <h1 className="sc-h1">{title}</h1>
            {description && <p className="sc-body mt-3 max-w-2xl">{description}</p>}
        </div>
    )
}
