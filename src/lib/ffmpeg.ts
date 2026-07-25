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

/**
 * Read a media file's duration in seconds by parsing ffmpeg's own stderr
 * ("Duration: HH:MM:SS.cc"). Avoids adding an ffprobe dependency — ffmpeg is
 * already bundled. ffmpeg exits non-zero here (no output file), which is
 * expected; we resolve from the parsed banner regardless of exit code.
 */
export function probeDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const proc = spawn(ffmpegPath(), ['-i', filePath])
        let stderr = ''
        proc.stderr.on('data', chunk => {
            stderr += chunk.toString()
        })
        proc.on('error', reject)
        proc.on('close', () => {
            const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
            if (!match) {
                reject(new Error(`Could not parse duration from ffmpeg output for ${filePath}`))
                return
            }
            const hours = parseInt(match[1], 10)
            const minutes = parseInt(match[2], 10)
            const seconds = parseFloat(match[3])
            resolve(hours * 3600 + minutes * 60 + seconds)
        })
    })
}
