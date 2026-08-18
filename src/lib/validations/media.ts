import { z } from 'zod'
import {
    MAX_IMAGE_MB,
    MAX_VIDEO_MB,
    MAX_IMAGE_BYTES,
    MAX_VIDEO_BYTES,
} from '@/lib/media-limits'

const ALLOWED_EXTENSIONS = /\.(jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv|flv|webm|mkv|mp3|wav|m4a|ogg|oga)$/i
const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv',
    'video/x-flv', 'video/webm', 'video/x-matroska',
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a',
    'audio/webm', 'audio/ogg',
]

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
            (file) => ALLOWED_MIME_TYPES.includes(file.type),
            {
                message: 'File MIME type is not allowed',
            },
        )
        .refine(
            (file) => !file.type.startsWith('image/') || file.size <= MAX_IMAGE_BYTES,
            {
                message: `Image size exceeds maximum of ${MAX_IMAGE_MB}MB`,
            },
        )
        .refine(
            (file) => file.type.startsWith('image/') || file.size <= MAX_VIDEO_BYTES,
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

export type FileUpload = z.infer<typeof fileUploadSchema>
export type CreateMediaAttachment = z.infer<typeof CreateMediaAttachmentSchema>
