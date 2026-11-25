import { randomUUID } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { initGarage } from '@/lib/object-store'
import { runFfmpeg } from '@/lib/ffmpeg'
import { downloadObjectToFile } from '@/lib/media-io'
import type { TranscriptSegment } from '@/lib/vtt'

export type { TranscriptSegment } from '@/lib/vtt'
export { segmentsToVtt, vttTimestamp } from '@/lib/vtt'

// Groq Whisper rejects audio above 25 MB; stay safely under it.
const MAX_AUDIO_BYTES = 24 * 1024 * 1024
const GROQ_TRANSLATIONS_URL = 'https://api.groq.com/openai/v1/audio/translations'
// A hung upstream call must not hold a claim forever.
const GROQ_TIMEOUT_MS = 120_000
// A PENDING/PROCESSING row untouched for this long is presumed orphaned by a
// crash or redeploy and may be reclaimed.
const STALE_JOB_MS = 15 * 60 * 1000

function whisperModel(): string {
    return process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3'
}

// Jobs run one at a time per server instance: each holds a full video on disk
// and an ffmpeg process, so a single lane bounds memory/CPU. Volume here is a
// handful of story videos per artisan — a queue library would be overkill.
let jobChain: Promise<void> = Promise.resolve()

function scheduleJob(mediaId: string) {
    jobChain = jobChain
        .then(() => processTranscription(mediaId))
        .catch(err => {
            console.error(`Unhandled transcription error for media ${mediaId}:`, err)
        })
}

/**
 * Atomically claim a transcript row for processing. Claimable states are
 * PENDING, FAILED (maker-requested retry), and stale PROCESSING (a job
 * orphaned by a crash or redeploy). Exactly one concurrent caller wins.
 */
async function claimTranscription(mediaId: string): Promise<boolean> {
    const staleCutoff = new Date(Date.now() - STALE_JOB_MS)
    const claimed = await prisma.mediaTranscript.updateMany({
        where: {
            mediaId,
            requestedAt: { not: null },
            OR: [
                { status: { in: ['PENDING', 'FAILED'] } },
                { status: 'PROCESSING', updatedAt: { lt: staleCutoff } },
            ],
        },
        data: { status: 'PROCESSING', error: null },
    })
    return claimed.count === 1
}

/**
 * Ensure a spoken answer (video or audio) has a caption transcript. Idempotent
 * after an explicit maker request: it no-ops for non-audio/video media and for
 * transcripts already done or actively in flight, otherwise it claims the row
 * and queues processing.
 */
export async function enqueueTranscription(mediaId: string): Promise<void> {
    const media = await prisma.mediaFile.findUnique({
        where: { id: mediaId },
        select: { id: true, mimeType: true },
    })
    // Audio answers get captions too — the worker extracts an mp3 from either
    // source, so both feed Whisper the same way.
    if (!media || !/^(video|audio)\//.test(media.mimeType)) return

    // Ensure the row exists without touching an existing one — the atomic
    // claim below is the only place that transitions state.
    await prisma.mediaTranscript.upsert({
        where: { mediaId },
        create: { mediaId, status: 'PENDING', requestedAt: new Date() },
        update: {},
    })

    // Legacy automatic jobs require an explicit request before they can run again.
    await prisma.mediaTranscript.updateMany({
        where: { mediaId, requestedAt: null, status: { not: 'READY' } },
        data: { requestedAt: new Date(), status: 'PENDING' },
    })
    if (await claimTranscription(mediaId)) scheduleJob(mediaId)
}

/**
 * Re-queue jobs orphaned by a crash or redeploy (rows stuck in PENDING or
 * PROCESSING past the staleness window). Called from instrumentation on
 * server boot and on a slow heartbeat. FAILED rows are deliberately not
 * swept — only the maker can request another attempt.
 */
export async function recoverStaleTranscriptions(): Promise<void> {
    const staleCutoff = new Date(Date.now() - STALE_JOB_MS)
    const stale = await prisma.mediaTranscript.findMany({
        where: {
            requestedAt: { not: null },
            status: { in: ['PENDING', 'PROCESSING'] },
            updatedAt: { lt: staleCutoff },
        },
        select: { mediaId: true },
    })
    for (const { mediaId } of stale) {
        // Legacy automatic jobs require an explicit request before they can run again.
    await prisma.mediaTranscript.updateMany({
        where: { mediaId, requestedAt: null, status: { not: 'READY' } },
        data: { requestedAt: new Date(), status: 'PENDING' },
    })
    if (await claimTranscription(mediaId)) scheduleJob(mediaId)
    }
}

async function setStatus(
    mediaId: string,
    status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED',
    data: Record<string, unknown> = {},
) {
    await prisma.mediaTranscript.update({
        where: { mediaId },
        data: { status, ...data },
    })
}

/**
 * Worker body — assumes the claim is already held (status PROCESSING).
 * Extracts audio from the source video, sends it to Groq Whisper to be
 * transcribed-and-translated to English with timestamps, and persists the
 * result. Temporary audio is removed after the request. Errors are recorded on
 * the transcript row.
 */
async function processTranscription(mediaId: string): Promise<void> {
    const media = await prisma.mediaFile.findUnique({ where: { id: mediaId } })
    if (!media) {
        await setStatus(mediaId, 'FAILED', { error: 'Source media not found' })
        return
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        await setStatus(mediaId, 'FAILED', { error: 'GROQ_API_KEY not configured' })
        return
    }

    const tmpDir = os.tmpdir()
    const inputPath = path.join(tmpDir, `transcribe-${randomUUID()}`)
    const audioPath = path.join(tmpDir, `transcribe-${randomUUID()}.mp3`)

    try {
        await initGarage()

        // 1. Pull the source video down to a temp file.
        await downloadObjectToFile(media.objectKey, inputPath)

        // 2. Extract a compact mono 16 kHz mp3 — small enough for Whisper and
        //    small enough to send as a temporary audio track.
        await runFfmpeg([
            '-i', inputPath,
            '-vn',
            '-ac', '1',
            '-ar', '16000',
            '-c:a', 'libmp3lame',
            '-b:a', '64k',
            '-y', audioPath,
        ])

        const audioBuffer = await fs.promises.readFile(audioPath)
        if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
            await setStatus(mediaId, 'FAILED', {
                error: `Extracted audio is ${Math.round(audioBuffer.byteLength / 1024 / 1024)} MB, over the ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB transcription limit`,
            })
            return
        }

        // The extracted audio stays temporary and is removed in the finally block.
        const request = await prisma.mediaTranscript.findFirst({
            where: { mediaId, requestedAt: { not: null } },
            select: { mediaId: true },
        })
        if (!request) return
        const form = new FormData()
        form.append('file', new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' }), 'audio.mp3')
        form.append('model', whisperModel())
        form.append('response_format', 'verbose_json')

        const res = await fetch(GROQ_TRANSLATIONS_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
            signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
        })
        if (!res.ok) {
            throw new Error(`Groq transcription failed (${res.status})`)
        }

        const data = (await res.json()) as {
            language?: string
            segments?: { start: number; end: number; text: string }[]
            text?: string
        }

        const segments: TranscriptSegment[] = (data.segments ?? []).map(s => ({
            start: s.start,
            end: s.end,
            text: (s.text ?? '').trim(),
        }))

        await setStatus(mediaId, 'READY', {
            segments,
            // Verified in testing: the translations endpoint reports the OUTPUT
            // language ("English"), not the detected source. True source-language
            // detection needs a separate `transcriptions` pass if ever required.
            sourceLanguage: data.language ?? null,
            error: null,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown transcription error'
        console.error(`Transcription failed for media ${mediaId}:`, error)
        await setStatus(mediaId, 'FAILED', { error: message }).catch(err => {
            console.error('Failed to record transcription failure:', err)
        })
    } finally {
        await fs.promises.rm(inputPath, { force: true }).catch(() => {})
        await fs.promises.rm(audioPath, { force: true }).catch(() => {})
    }
}

/**
 * Collect the extracted-audio MediaFile ids tied to the given source video
 * ids. The MediaTranscript rows themselves cascade when their source
 * MediaFile is deleted; the audio assets have no attachment, so callers must
 * GC them explicitly (gather before deleting the source, then pass to
 * deleteMediaFiles alongside it).
 */
export async function collectTranscriptAudioIds(sourceMediaIds: string[]): Promise<string[]> {
    const ids = sourceMediaIds.filter(Boolean)
    if (ids.length === 0) return []
    const transcripts = await prisma.mediaTranscript.findMany({
        where: { mediaId: { in: ids }, audioMediaId: { not: null } },
        select: { audioMediaId: true },
    })
    return transcripts
        .map(t => t.audioMediaId)
        .filter((v): v is string => typeof v === 'string')
}
