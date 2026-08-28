import { Play } from 'lucide-react'

const SIZES = {
    sm: { pad: 'p-1', icon: 'h-3 w-3' },
    md: { pad: 'p-2', icon: 'h-5 w-5' },
    lg: { pad: 'p-3', icon: 'h-6 w-6' },
}

/**
 * Stand-in for a YouTube video tile.
 *
 * The real thumbnail lives on img.youtube.com, and loading it would hand Google
 * the visitor's IP address before they have asked to watch anything. The tile is
 * drawn locally instead, and the embed itself loads only once the video is
 * opened in the lightbox.
 */
export function YouTubeTile({ size = 'md' }: { size?: keyof typeof SIZES }) {
    const { pad, icon } = SIZES[size]

    return (
        <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'var(--sc-ink)' }}
        >
            <div className={`rounded-full bg-black/60 ${pad}`}>
                <Play className={`${icon} fill-white text-white`} />
            </div>
        </div>
    )
}
