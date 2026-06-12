export type MediaKind = 'image' | 'video' | 'audio'

/**
 * Classify a media file by its MIME type. Defaults to 'image' when unknown,
 * matching how legacy gallery items (no stored kind) were always rendered.
 */
export function mediaKind(mimeType?: string | null): MediaKind {
    const m = (mimeType ?? '').toLowerCase()
    if (m.startsWith('video/')) return 'video'
    if (m.startsWith('audio/')) return 'audio'
    return 'image'
}
