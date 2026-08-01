import { spawn } from 'child_process'
import ffmpegStatic from 'ffmpeg-static'

// Shared low-level ffmpeg wrapper used by both the caption pipeline
// (transcription.ts) and the story-film renderer (lib/film). Prefers an
// explicit FFMPEG_PATH (set to the system binary in the production container),
// then the bundled ffmpeg-static, then whatever is on PATH.
export function ffmpegPath(): string {
    return process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg'
}

export function runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn(ffmpegPath(), args)
        let stderr = ''
        proc.stderr.on('data', chunk => {
            stderr += chunk.toString()
        })
        proc.on('error', reject)
        proc.on('close', code => {
            if (code === 0) resolve()
            else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`))
        })
    })
}

// Run ffmpeg and resolve its stderr regardless of exit code — probe commands
// (`-i` only, or decode-to-null) exit non-zero by design.
function captureStderr(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn(ffmpegPath(), args)
        let stderr = ''
        proc.stderr.on('data', chunk => {
            stderr += chunk.toString()
        })
        proc.on('error', reject)
        proc.on('close', () => resolve(stderr))
    })
}

function hmsToSeconds(h: string, m: string, s: string): number {
    return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s)
}

/**
 * Read a media file's duration in seconds without ffprobe. Prefers the
 * container "Duration:" banner; when that is absent or "N/A" — common for
 * MediaRecorder webm/mp4, whose headers omit the length — it falls back to
 * decoding the audio to null and taking the last processed timestamp.
 */
export async function probeDuration(filePath: string): Promise<number> {
    const banner = await captureStderr(['-i', filePath])
    const dur = banner.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
    if (dur) return hmsToSeconds(dur[1], dur[2], dur[3])

    // No usable Duration header — decode audio to null and read the final time.
    const decoded = await captureStderr(['-i', filePath, '-vn', '-f', 'null', '-'])
    const times = [...decoded.matchAll(/time=\s*(\d+):(\d+):(\d+(?:\.\d+)?)/g)]
    const last = times[times.length - 1]
    if (last) return hmsToSeconds(last[1], last[2], last[3])

    throw new Error(`Could not determine duration for ${filePath}`)
}
