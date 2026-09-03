// Browser-side duration measurement, shared by the film storyboard (which needs
// every spoken answer's length to lay out its preview) and the film panel (which
// reports an uploaded film's length). Client-only: it builds a media element.

// Give up on a recording that never reports a length, rather than leaving the
// caller waiting on it.
const MEASURE_TIMEOUT_MS = 5000

/**
 * Resolve a recording's length in seconds, resolving 0 when it cannot be
 * determined. Never rejects, so a single unreadable file cannot stall a caller
 * measuring several.
 *
 * In-browser recordings are written by MediaRecorder without a container
 * duration header, so the browser reports Infinity until it has seen the end of
 * the stream. Seeking far past the end makes it work the length out. This is the
 * client-side counterpart of the decode-to-null fallback that probeDuration uses
 * on the server (see lib/ffmpeg.ts).
 */
export function measureMediaDuration(kind: 'audio' | 'video', src: string): Promise<number> {
    return new Promise(resolve => {
        const el = document.createElement(kind === 'video' ? 'video' : 'audio')
        el.preload = 'metadata'

        let settled = false
        const finish = (value: number) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            el.removeEventListener('loadedmetadata', onLoaded)
            el.removeEventListener('durationchange', onProgress)
            el.removeEventListener('timeupdate', onProgress)
            el.removeEventListener('error', onError)
            // Drop the source so the browser stops buffering the file.
            el.removeAttribute('src')
            el.load()
            resolve(value)
        }

        const hasLength = () => Number.isFinite(el.duration) && el.duration > 0
        const onProgress = () => {
            if (hasLength()) finish(el.duration)
        }
        const onError = () => finish(0)
        const onLoaded = () => {
            if (hasLength()) {
                finish(el.duration)
                return
            }
            // Some browsers report the resolved length through timeupdate after
            // the seek rather than through durationchange.
            el.addEventListener('durationchange', onProgress)
            el.addEventListener('timeupdate', onProgress)
            try {
                el.currentTime = 1e101
            } catch {
                finish(0)
            }
        }

        const timer = setTimeout(() => finish(0), MEASURE_TIMEOUT_MS)
        el.addEventListener('loadedmetadata', onLoaded)
        el.addEventListener('error', onError)
        el.src = src
    })
}

/** Format a duration as m:ss for display. */
export function formatDuration(seconds: number): string {
    const total = Math.round(seconds)
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${String(s).padStart(2, '0')}`
}
