import type { ReactNode } from 'react'

/**
 * Standard page header used across listing and content pages
 * (about, artisans, crafts, groups, …).
 *
 * Renders a centered title with an optional muted description beneath it,
 * keeping the title/text placement uniform site-wide.
 */
export function PageHeader({
    title,
    description,
    className,
}: {
    title: ReactNode
    description?: ReactNode
    className?: string
}) {
    return (
        <div className={`mb-8 text-center ${className ?? ''}`}>
            <h1 className="sc-h1">{title}</h1>
            {description && (
                <p className="sc-body mx-auto mt-3 max-w-3xl">{description}</p>
            )}
        </div>
    )
}
