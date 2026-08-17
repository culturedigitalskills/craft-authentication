// Pure WebVTT helpers — no I/O, no heavy imports, so they're cheap to unit test
// and safe to load in any route.

// One caption cue, timed in seconds against the original audio/video.
export interface TranscriptSegment {
    start: number
    end: number
    text: string
}

// HH:MM:SS.mmm — the WebVTT cue timestamp format.
export function vttTimestamp(seconds: number): string {
    const totalMs = Math.max(0, Math.round(seconds * 1000))
    const ms = totalMs % 1000
    const totalSec = Math.floor(totalMs / 1000)
    const s = totalSec % 60
    const m = Math.floor(totalSec / 60) % 60
    const h = Math.floor(totalSec / 3600)
    const pad = (n: number, width = 2) => String(n).padStart(width, '0')
    return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`
}

// VTT cue text is parsed for markup tags, so raw <, > and & from a transcript
// would be swallowed or misrendered by the player.
function escapeVttText(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Build a WebVTT document from timed segments. Empty cues are dropped.
export function segmentsToVtt(segments: TranscriptSegment[]): string {
    const cues = segments
        .filter(seg => seg && typeof seg.text === 'string' && seg.text.trim().length > 0)
        .map(seg => {
            const text = escapeVttText(seg.text.trim().replace(/\r?\n/g, ' '))
            return `${vttTimestamp(seg.start)} --> ${vttTimestamp(seg.end)}\n${text}`
        })
    return `WEBVTT\n\n${cues.join('\n\n')}\n`
}
