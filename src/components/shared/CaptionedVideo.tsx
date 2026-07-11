'use client'

import { useEffect, useRef } from 'react'

interface CaptionedVideoProps {
    src: string
    /** WebVTT captions URL; omit while the transcript isn't ready. */
    captionsSrc?: string
    /** Pre-translated track label — translation stays in the caller. */
    captionsLabel?: string
    className?: string
    preload?: 'none' | 'metadata' | 'auto'
}

export function CaptionedVideo({
    src,
    captionsSrc,
    captionsLabel,
    className,
    preload,
}: CaptionedVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const video = videoRef.current
        if (!video || !captionsSrc) return
        // Browsers only honor the track's `default` attribute at the media
        // element's initial load; a <track> inserted into an already-mounted
        // <video> (caption job finishing, client-side navigation) stays
        // mode="disabled" — so force it on. Setting the mode is also what
        // triggers the VTT fetch. Runs only when captionsSrc changes, so a
        // user turning captions off via the native controls isn't overridden.
        const show = () => {
            const track = video.textTracks[0]
            if (track && track.mode !== 'showing') track.mode = 'showing'
        }
        show()
        // Safety net for engines that populate the TextTrackList asynchronously.
        video.textTracks.addEventListener('addtrack', show)
        return () => video.textTracks.removeEventListener('addtrack', show)
    }, [captionsSrc])

    return (
        <video ref={videoRef} src={src} controls className={className} preload={preload}>
            {captionsSrc && (
                // Captions are English-only by design (see /api/media/[id]/subtitles).
                <track kind="captions" srcLang="en" label={captionsLabel} src={captionsSrc} default />
            )}
        </video>
    )
}
