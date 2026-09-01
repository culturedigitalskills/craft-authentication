// Shared client-side media upload with progress reporting. Uses XHR because
// fetch cannot report upload progress. All uploads go through
// POST /api/media/upload, which returns the created MediaFile row.

export type UploadedMedia = { id: string; mimeType: string | null }

export type UploadOutcome =
    | { ok: true; media: UploadedMedia }
    // `status` lets callers translate the failure; `error` is the server's own
    // wording, which is English and only suitable as a last resort.
    | { ok: false; error: string | null; status: number }

export function uploadWithProgress(
    file: File,
    onProgress?: (pct: number) => void,
): Promise<UploadOutcome> {
    return new Promise((resolve) => {
        const formData = new FormData()
        formData.append('file', file)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/media/upload')
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
            let body: { id?: string; mimeType?: string | null; error?: string } | null = null
            try {
                body = JSON.parse(xhr.responseText)
            } catch {
                // Non-JSON body — treated as failure below unless status is ok.
            }
            if (xhr.status >= 200 && xhr.status < 300 && body?.id) {
                onProgress?.(100)
                resolve({ ok: true, media: { id: body.id, mimeType: body.mimeType ?? null } })
            } else {
                resolve({ ok: false, error: body?.error ?? null, status: xhr.status })
            }
        }
        xhr.onerror = () => resolve({ ok: false, error: null, status: 0 })
        xhr.send(formData)
    })
}
