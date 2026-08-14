import { randomUUID } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { initGarage } from '@/lib/object-store'
import { runFfmpeg } from '@/lib/ffmpeg'
import { downloadObjectToFile, createMediaFileFromBuffer } from '@/lib/media-io'
import { deleteMediaFiles } from '@/lib/media-delete'
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
 * PENDING, FAILED (manual retry via re-save), and stale PROCESSING (a job
 * orphaned by a crash or redeploy). Exactly one concurrent caller wins.
 */
async function claimTranscription(mediaId: string): Promise<boolean> {
    const staleCutoff = new Date(Date.now() - STALE_JOB_MS)
    const claimed = await prisma.mediaTranscript.updateMany({
        where: {
            mediaId,
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
 * and safe to call on every save: it no-ops for non-audio/video media and for
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
        create: { mediaId, status: 'PENDING' },
        update: {},
    })

    if (await claimTranscription(mediaId)) scheduleJob(mediaId)
}

/**
 * Re-queue jobs orphaned by a crash or redeploy (rows stuck in PENDING or
 * PROCESSING past the staleness window). Called from instrumentation on
 * server boot and on a slow heartbeat. FAILED rows are deliberately not
 * swept — they retry when the artisan saves again.
 */
export async function recoverStaleTranscriptions(): Promise<void> {
    const staleCutoff = new Date(Date.now() - STALE_JOB_MS)
    const stale = await prisma.mediaTranscript.findMany({
        where: {
            status: { in: ['PENDING', 'PROCESSING'] },
            updatedAt: { lt: staleCutoff },
        },
        select: { mediaId: true },
    })
    for (const { mediaId } of stale) {
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
 * result. The extracted audio is kept as its own MediaFile for later reuse
 * (e.g. a montage). Errors are recorded on the transcript row, never thrown.
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
        //    a reusable audio asset for a future montage.
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

        // 3. Store the extracted audio as its own MediaFile (kept for reuse).
        const audio = await createMediaFileFromBuffer({
            buffer: audioBuffer,
            mimeType: 'audio/mpeg',
            extension: 'mp3',
            originalName: `audio-${mediaId}.mp3`,
            uploaderId: media.uploaderId,
        })
        try {
            await prisma.mediaTranscript.update({
                where: { mediaId },
                data: { audioMediaId: audio.id },
            })
        } catch {
            // The transcript row vanished mid-job (source video replaced or
            // deleted). Don't strand the audio we just created.
            await deleteMediaFiles([audio.id])
            return
        }

        // 4. Transcribe + translate to English (with timestamps) via Groq Whisper.
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
            const body = await res.text().catch(() => '')
            throw new Error(`Groq transcription failed (${res.status}): ${body.slice(0, 300)}`)
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
