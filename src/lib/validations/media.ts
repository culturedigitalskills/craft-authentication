import { z } from 'zod'
import {
    MAX_IMAGE_MB,
    MAX_VIDEO_MB,
    MAX_IMAGE_BYTES,
    MAX_VIDEO_BYTES,
} from '@/lib/media-limits'

const ALLOWED_EXTENSIONS = /\.(jpeg|jpg|png|gif|webp|mp4|m4v|avi|mov|wmv|flv|webm|mkv|3gp|mp3|wav|m4a|aac|ogg|oga|ogv)$/i

// Browsers disagree about the type of the same file: a .mp3 arrives as
// audio/mpeg or audio/mp3, a .avi as video/x-msvideo or the made-up video/avi,
// and some systems send nothing at all. The extension list above is the real
// gate; this list exists to reject obviously wrong content, so it has to cover
// the aliases actually seen in the wild or it rejects valid recordings.
const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/x-m4v', 'video/avi', 'video/msvideo', 'video/x-msvideo',
    'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm',
    'video/x-matroska', 'video/3gpp', 'video/ogg',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/vnd.wave', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac',
    'audio/webm', 'audio/ogg', 'audio/vorbis',
]

// Some operating systems hand the browser a file with no type, or a generic
// one. Rather than rejecting those, the type is derived from the extension.
const UNSPECIFIED_MIME_TYPES = ['', 'application/octet-stream']

const MIME_BY_EXTENSION: Record<string, string> = {
    jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp',
    mp4: 'video/mp4', m4v: 'video/mp4', avi: 'video/x-msvideo',
    mov: 'video/quicktime', wmv: 'video/x-ms-wmv', flv: 'video/x-flv',
    webm: 'video/webm', mkv: 'video/x-matroska', '3gp': 'video/3gpp',
    ogv: 'video/ogg',
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
    aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg',
}

/**
 * The type to record for an upload. A browser that reports nothing useful would
 * otherwise leave the row with an empty mimeType, and mediaKind treats an
 * unknown type as an image, which would file someone's spoken answer as a photo
 * and drop it from their film.
 */
export function resolveMimeType(filename: string, reportedType: string): string {
    if (!UNSPECIFIED_MIME_TYPES.includes(reportedType)) return reportedType
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    return MIME_BY_EXTENSION[ext] ?? reportedType
}

// Every rule below judges the resolved type, never the raw one the browser
// reported. Judging the raw type let a file with no reported type slip past the
// image size limit and then be stored as an image anyway.
export const fileUploadSchema = z.object({
    file: z
        .instanceof(File)
        .refine(
            (file) => {
                const ext = `.${file.name.split('.').pop()}`
                return ALLOWED_EXTENSIONS.test(ext)
            },
            {
                message: 'Only image and video files are allowed',
            },
        )
        .refine(
            (file) => ALLOWED_MIME_TYPES.includes(resolveMimeType(file.name, file.type)),
            {
                message: 'File MIME type is not allowed',
            },
        )
        .refine(
            (file) =>
                !resolveMimeType(file.name, file.type).startsWith('image/') ||
                file.size <= MAX_IMAGE_BYTES,
            {
                message: `Image size exceeds maximum of ${MAX_IMAGE_MB}MB`,
            },
        )
        .refine(
            (file) =>
                resolveMimeType(file.name, file.type).startsWith('image/') ||
                file.size <= MAX_VIDEO_BYTES,
            {
                message: `File size exceeds maximum of ${MAX_VIDEO_MB}MB`,
            },
        ),
})

export const CreateMediaAttachmentSchema = z.object({
    mediaId: z.uuid(),
    entityType: z.string().min(1),
    entityId: z.uuid(),
    attachmentType: z.enum(['HERO', 'COVER', 'GALLERY', 'PROCESS']),
    isPrimary: z.boolean().default(false),
    isPublic: z.boolean().default(true),
    displayOrder: z.number().int().min(0).default(0),
})

// Reordering is expressed as the full intended sequence rather than a single
// move, so the server renumbers in one transaction and concurrent moves cannot
// interleave into a half-applied order.
export const ReorderMediaAttachmentsSchema = z.object({
    entityType: z.literal('CraftStory'),
    entityId: z.uuid(),
    orderedAttachmentIds: z.array(z.uuid()).min(1),
})

export type FileUpload = z.infer<typeof fileUploadSchema>
export type CreateMediaAttachment = z.infer<typeof CreateMediaAttachmentSchema>
export type ReorderMediaAttachments = z.infer<typeof ReorderMediaAttachmentsSchema>
