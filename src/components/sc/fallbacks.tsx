/**
 * On-brand image fallbacks for the Sustainable Crafting design system.
 *
 * Every entity (craft, artisan, group) can render without an uploaded photo:
 * we derive a warm, palette-consistent placeholder so a missing image never
 * looks broken. Keep real <img>/<Image> with object-fit:cover on top of these.
 */
import type { CSSProperties } from 'react'

/** Secondary craft hues (design tokens) used only to differentiate placeholders. */
const HUES = [
    'var(--sc-teal)',
    'var(--sc-ochre)',
    'var(--sc-olive)',
    'var(--sc-plum)',
    'var(--sc-accent)',
    'var(--sc-teal-deep)',
]

/** Tiny deterministic string hash so a given name always gets the same tint. */
export function hashString(input: string): number {
    let h = 0
    for (let i = 0; i < input.length; i++) {
        h = (h << 5) - h + input.charCodeAt(i)
        h |= 0
    }
    return Math.abs(h)
}

/** Pick a stable hue token, seeded from a string (e.g. a name or slug). */
export function tintFor(seed: string): string {
    return HUES[hashString(seed) % HUES.length]
}

/** Up-to-two-letter initials from a name (falls back to a single glyph). */
export function initialsFor(name?: string | null): string {
    if (!name) return '·'
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '·'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Portrait placeholder — initials on a warm gradient, tint seeded from the
 * name so profiles vary. Used for artisan avatars / portrait cards.
 */
export function PortraitFallback({
    name,
    className,
    style,
}: {
    name?: string | null
    className?: string
    style?: CSSProperties
}) {
    const hue = tintFor(name ?? 'artisan')
    return (
        <div
            className={`flex h-full w-full items-center justify-center ${className ?? ''}`}
            style={{
                background: `linear-gradient(135deg, ${hue} 0%, color-mix(in srgb, ${hue} 55%, var(--sc-ink)) 100%)`,
                ...style,
            }}
        >
            <span
                style={{
                    fontFamily: 'var(--sc-font-display)',
                    fontWeight: 600,
                    color: '#fff8ee',
                    fontSize: 'clamp(28px, 22%, 88px)',
                    letterSpacing: '0.04em',
                }}
            >
                {initialsFor(name)}
            </span>
        </div>
    )
}

/**
 * Cover placeholder — shibori-style indigo dot grid on the deep ink ground.
 * The standard fallback for craft / cover imagery.
 */
export function IndigoDotsCover({ className, style }: { className?: string; style?: CSSProperties }) {
    return (
        <div
            className={`h-full w-full ${className ?? ''}`}
            style={{
                background: 'var(--sc-ink)',
                backgroundImage:
                    'radial-gradient(circle, rgba(244,237,224,0.16) 1.6px, transparent 1.7px)',
                backgroundSize: '18px 18px',
                ...style,
            }}
        />
    )
}

/**
 * Kraft monogram — warm ground with a giant low-opacity watermark initial.
 * Used for group logo tiles and as an alternate cover.
 */
export function KraftMonogram({
    name,
    className,
    style,
}: {
    name?: string | null
    className?: string
    style?: CSSProperties
}) {
    const hue = tintFor(name ?? 'group')
    return (
        <div
            className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className ?? ''}`}
            style={{
                background: `linear-gradient(135deg, var(--sc-paper-hi) 0%, color-mix(in srgb, ${hue} 16%, var(--sc-paper-lo)) 100%)`,
                ...style,
            }}
        >
            <span
                style={{
                    fontFamily: 'var(--sc-font-display)',
                    fontWeight: 700,
                    color: `color-mix(in srgb, ${hue} 55%, var(--sc-ink))`,
                    opacity: 0.35,
                    fontSize: 'clamp(48px, 56%, 180px)',
                    lineHeight: 1,
                }}
            >
                {initialsFor(name).slice(0, 1)}
            </span>
        </div>
    )
}
