'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'

/**
 * OpenStreetMap embed that waits for a click.
 *
 * Rendering the iframe straight away would disclose every visitor's IP address
 * to OpenStreetMap whether or not they cared about the map. Holding it behind a
 * click keeps the page free of third-party requests, which is what lets the site
 * run without a cookie consent banner.
 */
export function ConsentedMap({
    src,
    title,
    loadLabel,
    noticeLabel,
}: {
    src: string
    title: string
    loadLabel: string
    noticeLabel: string
}) {
    const [loaded, setLoaded] = useState(false)

    if (loaded) {
        return (
            <iframe
                title={title}
                src={src}
                className="h-56 w-full rounded-[var(--sc-r-btn)]"
                style={{ border: '1px solid var(--sc-border)' }}
                loading="lazy"
            />
        )
    }

    return (
        <button
            type="button"
            onClick={() => setLoaded(true)}
            className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-[var(--sc-r-btn)] p-4 text-center transition-colors hover:bg-[color:var(--sc-surface)]"
            style={{ border: '1px solid var(--sc-border)', background: 'var(--sc-surface-trans)' }}
        >
            <MapPin className="h-6 w-6" style={{ color: 'var(--sc-accent)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--sc-text)' }}>
                {loadLabel}
            </span>
            <span className="text-xs" style={{ color: 'var(--sc-text-soft)' }}>
                {noticeLabel}
            </span>
        </button>
    )
}
