'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { prepareFileForUpload } from '@/lib/media-limits'
import { uploadWithProgress } from '@/lib/upload'
import { Check, Circle, Loader2, Mic, RotateCcw, Square, X } from 'lucide-react'

// Codec-annotated types record best; the upload allowlist matches the base mime
// exactly, so we always strip the ";codecs=..." suffix before naming/typing the file.
const VIDEO_MIME_CHAIN = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
]
const AUDIO_MIME_CHAIN = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

export function baseMimeType(mime: string): string {
    return mime.split(';')[0].trim().toLowerCase()
}

// Maps a MediaRecorder mime to an extension the server's ALLOWED_EXTENSIONS accepts
// (note: no ".weba" — audio/webm must be named ".webm").
export function extFromMime(mime: string): string {
    switch (baseMimeType(mime)) {
        case 'audio/mp4':
        case 'audio/x-m4a':
            return 'm4a'
        case 'video/mp4':
            return 'mp4'
        case 'video/webm':
        case 'audio/webm':
            return 'webm'
        default:
            return 'webm'
    }
}

function pickMimeType(chain: string[]): string {
    if (typeof MediaRecorder === 'undefined') return ''
    for (const type of chain) {
        if (MediaRecorder.isTypeSupported(type)) return type
    }
    return ''
}

function formatElapsed(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

type Phase = 'requesting' | 'ready' | 'recording' | 'preview' | 'uploading' | 'error'
type ErrorKey = 'permissionDenied' | 'notSupported' | 'uploadFailed' | 'tooLarge'

interface RecorderControlProps {
    mode: 'audio' | 'video'
    onUploaded: (mediaId: string, mimeType: string) => void
    onCancel: () => void
}

export function RecorderControl({ mode, onUploaded, onCancel }: RecorderControlProps) {
    const t = useTranslations('craftStory.recorder')
    const [phase, setPhase] = useState<Phase>('requesting')
    const [elapsed, setElapsed] = useState(0)
    const [errorKey, setErrorKey] = useState<ErrorKey | null>(null)
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
    const [uploadPct, setUploadPct] = useState(0)

    const streamRef = useRef<MediaStream | null>(null)
    const recorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const blobRef = useRef<Blob | null>(null)
    const mimeRef = useRef<string>('')
    const urlRef = useRef<string | null>(null)
    const liveVideoRef = useRef<HTMLVideoElement | null>(null)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const disposedRef = useRef(false)

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
    }, [])

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    // Acquire the mic/camera and show a live preview, then wait for the user to hit record.
    const acquire = useCallback(async () => {
        if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            setErrorKey('notSupported')
            setPhase('error')
            return
        }
        setErrorKey(null)
        setPhase('requesting')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: mode === 'video' ? { facingMode: 'user' } : false,
            })
            if (disposedRef.current) {
                stream.getTracks().forEach((track) => track.stop())
                return
            }
            streamRef.current = stream
            setPhase('ready')
        } catch {
            if (!disposedRef.current) {
                setErrorKey('permissionDenied')
                setPhase('error')
            }
        }
    }, [mode])

    useEffect(() => {
        disposedRef.current = false
        void acquire()
        return () => {
            disposedRef.current = true
            stopStream()
            clearTimer()
            if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        }
    }, [acquire, stopStream, clearTimer])

    // Bind the live stream to the preview element whenever it is on screen.
    useEffect(() => {
        if (mode === 'video' && (phase === 'ready' || phase === 'recording') && liveVideoRef.current) {
            liveVideoRef.current.srcObject = streamRef.current
        }
    }, [mode, phase])

    function startRecording() {
        const stream = streamRef.current
        if (!stream) return
        const preferred = pickMimeType(mode === 'video' ? VIDEO_MIME_CHAIN : AUDIO_MIME_CHAIN)
        mimeRef.current = preferred || (mode === 'video' ? 'video/webm' : 'audio/webm')
        chunksRef.current = []

        let recorder: MediaRecorder
        try {
            recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream)
        } catch {
            setErrorKey('notSupported')
            setPhase('error')
            return
        }

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
        }
        recorder.onstop = () => {
            const actualMime = recorder.mimeType || mimeRef.current
            mimeRef.current = actualMime
            const blob = new Blob(chunksRef.current, { type: actualMime })
            blobRef.current = blob
            if (urlRef.current) URL.revokeObjectURL(urlRef.current)
            const url = URL.createObjectURL(blob)
            urlRef.current = url
            setRecordedUrl(url)
            setPhase('preview')
            // We have the clip — release the camera light immediately.
            stopStream()
        }

        recorderRef.current = recorder
        recorder.start()
        setElapsed(0)
        setPhase('recording')
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    }

    function stopRecording() {
        clearTimer()
        recorderRef.current?.stop()
    }

    function retake() {
        if (urlRef.current) {
            URL.revokeObjectURL(urlRef.current)
            urlRef.current = null
        }
        setRecordedUrl(null)
        blobRef.current = null
        setElapsed(0)
        void acquire()
    }

    async function useRecording() {
        const blob = blobRef.current
        if (!blob) return
        setPhase('uploading')
        setUploadPct(0)

        const base = baseMimeType(mimeRef.current)
        const file = new File([blob], `recording.${extFromMime(mimeRef.current)}`, { type: base })

        const prepared = await prepareFileForUpload(file)
        if (!prepared.ok) {
            setErrorKey('tooLarge')
            setPhase('preview')
            return
        }

        const outcome = await uploadWithProgress(prepared.file, setUploadPct)
        if (outcome.ok) {
            onUploaded(outcome.media.id, outcome.media.mimeType ?? base)
        } else {
            setErrorKey('uploadFailed')
            setPhase('preview')
        }
    }

    return (
        <div className="rounded-lg border border-border bg-background p-4">
            {phase === 'error' ? (
                <div className="space-y-3 text-center">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {t(errorKey ?? 'notSupported')}
                    </p>
                    <div className="flex justify-center gap-2">
                        {errorKey === 'permissionDenied' && (
                            <Button type="button" variant="outline" size="sm" onClick={() => void acquire()}>
                                <RotateCcw className="mr-1.5 h-4 w-4" />
                                {t('retake')}
                            </Button>
                        )}
                        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                            <X className="mr-1.5 h-4 w-4" />
                            {t('cancel')}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Live camera / mic preview */}
                    {(phase === 'requesting' || phase === 'ready' || phase === 'recording') && (
                        <div className="flex items-center justify-center rounded-md bg-muted/40 p-4">
                            {mode === 'video' ? (
                                <video
                                    ref={liveVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="max-h-64 w-full rounded-md bg-black"
                                />
                            ) : (
                                <div
                                    className={`flex h-24 w-24 items-center justify-center rounded-full ${
                                        phase === 'recording' ? 'animate-pulse bg-red-500/20' : 'bg-muted'
                                    }`}
                                >
                                    <Mic className={`h-10 w-10 ${phase === 'recording' ? 'text-red-500' : 'text-muted-foreground'}`} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recorded clip playback */}
                    {phase === 'preview' && recordedUrl && (
                        mode === 'video' ? (
                            <video src={recordedUrl} controls playsInline className="max-h-64 w-full rounded-md bg-black" />
                        ) : (
                            <audio src={recordedUrl} controls className="w-full" />
                        )
                    )}

                    {/* Recording timer */}
                    {phase === 'recording' && (
                        <p className="flex items-center justify-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                            {t('recording')} · {formatElapsed(elapsed)}
                        </p>
                    )}

                    {/* Upload progress */}
                    {phase === 'uploading' && (
                        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('uploading')} {uploadPct > 0 ? `${uploadPct}%` : ''}
                        </p>
                    )}

                    {errorKey && phase === 'preview' && (
                        <p className="text-center text-sm text-red-600 dark:text-red-400">{t(errorKey)}</p>
                    )}

                    {/* Controls */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {phase === 'requesting' && (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t('requesting')}
                            </p>
                        )}

                        {phase === 'ready' && (
                            <>
                                <Button type="button" size="sm" onClick={startRecording}>
                                    <Circle className="mr-1.5 h-4 w-4 fill-current text-red-500" />
                                    {mode === 'video' ? t('recordVideo') : t('recordAudio')}
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                                    {t('cancel')}
                                </Button>
                            </>
                        )}

                        {phase === 'recording' && (
                            <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
                                <Square className="mr-1.5 h-4 w-4 fill-current" />
                                {t('stop')}
                            </Button>
                        )}

                        {phase === 'preview' && (
                            <>
                                <Button type="button" size="sm" onClick={() => void useRecording()}>
                                    <Check className="mr-1.5 h-4 w-4" />
                                    {t('use')}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={retake}>
                                    <RotateCcw className="mr-1.5 h-4 w-4" />
                                    {t('retake')}
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                                    {t('cancel')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
