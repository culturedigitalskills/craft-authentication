export function extractYouTubeId(input: string): string | null {
    const trimmed = input.trim()
    if (!trimmed) return null

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

    try {
        const url = new URL(trimmed)
        const host = url.hostname.replace(/^www\./, '')

        if (host === 'youtu.be') {
            const id = url.pathname.slice(1)
            return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
        }

        if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
            const v = url.searchParams.get('v')
            if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v

            const embedMatch = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/)
            if (embedMatch) return embedMatch[1]

            const shortsMatch = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/)
            if (shortsMatch) return shortsMatch[1]
        }
    } catch {
        return null
    }

    return null
}

export function youtubeThumbnailUrl(id: string): string {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

export function youtubeEmbedUrl(id: string): string {
    return `https://www.youtube.com/embed/${id}`
}
