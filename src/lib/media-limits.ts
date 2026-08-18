// Single source of truth for upload size limits (used by both the uploader
// components and the server-side schema in src/lib/validations/media.ts),
// plus client-side image downscaling. Client-safe: no env access, browser
// APIs only inside the async functions.

export const MAX_IMAGE_MB = 8
export const MAX_VIDEO_MB = 100
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024

const DEFAULT_MAX_DIMENSION = 2560
const DEFAULT_QUALITY = 0.85

export type MediaValidation =
    | { ok: true; file: File }
    | { ok: false; reason: 'imageTooLarge' | 'videoTooLarge'; maxMb: number }

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === 'function') {
        return createImageBitmap(file)
    }
    const url = URL.createObjectURL(file)
    try {
        return await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = url
        })
    } finally {
        URL.revokeObjectURL(url)
    }
}

/**
 * Downscale an image so its longest side is at most `maxDimension`, re-encoded
 * in its original format (PNG stays PNG to preserve transparency). Returns the
 * original file when it is already small enough, when re-encoding would grow
 * it, or when decoding fails (the server still validates).
 */
export async function downscaleImage(
    file: File,
    opts?: { maxDimension?: number; quality?: number },
): Promise<File> {
    const maxDimension = opts?.maxDimension ?? DEFAULT_MAX_DIMENSION
    const quality = opts?.quality ?? DEFAULT_QUALITY

    try {
        const bitmap = await loadBitmap(file)
        const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
        if (scale === 1 && file.size <= MAX_IMAGE_BYTES) return file

        const canvas = document.createElement('canvas')
        canvas.width = Math.round(bitmap.width * scale)
        canvas.height = Math.round(bitmap.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return file
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        if ('close' in bitmap) bitmap.close()

        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, type, quality),
        )
        if (!blob || blob.size >= file.size) return file

        const name =
            type === 'image/jpeg' && file.type !== 'image/jpeg'
                ? file.name.replace(/\.[^.]+$/, '.jpg')
                : file.name
        return new File([blob], name, { type })
    } catch {
        return file
    }
}

/**
 * Validate (and for images, automatically downscale) a file before upload.
 * GIFs are never re-encoded — canvas would destroy animation — so they only
 * get the size check. Callers translate the failure `reason` themselves.
 */
export async function prepareFileForUpload(file: File): Promise<MediaValidation> {
    if (file.type.startsWith('image/') && file.type !== 'image/gif') {
        const prepared = file.size > MAX_IMAGE_BYTES ? await downscaleImage(file) : file
        if (prepared.size > MAX_IMAGE_BYTES) {
            return { ok: false, reason: 'imageTooLarge', maxMb: MAX_IMAGE_MB }
        }
        return { ok: true, file: prepared }
    }

    if (file.type === 'image/gif') {
        if (file.size > MAX_IMAGE_BYTES) {
            return { ok: false, reason: 'imageTooLarge', maxMb: MAX_IMAGE_MB }
        }
        return { ok: true, file }
    }

    if (file.size > MAX_VIDEO_BYTES) {
        return { ok: false, reason: 'videoTooLarge', maxMb: MAX_VIDEO_MB }
    }
    return { ok: true, file }
}
