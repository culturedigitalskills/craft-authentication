import { z } from 'zod'

const ALLOWED_EXTENSIONS = /\.(jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv|flv|webm|mkv|mp3|wav|m4a|ogg|oga)$/i
const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv',
    'video/x-flv', 'video/webm', 'video/x-matroska',
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a',
    'audio/webm', 'audio/ogg',
]
const MAX_FILE_SIZE = (parseInt(process.env.MAX_MEDIA_SIZE ?? '100') || 100) * 1024 * 1024 // 100MB

export const mediaQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).catch(1),
    limit: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .pipe(z.number().int().positive().max(100))
        .catch(10),
    type: z.enum(['image', 'video']).optional(),
})

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
            (file) => {
                return file.size <= MAX_FILE_SIZE
            },
            {
                message: `File size exceeds maximum of ${process.env.MAX_MEDIA_SIZE || 100}MB`,
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

export type MediaQuery = z.infer<typeof mediaQuerySchema>
export type FileUpload = z.infer<typeof fileUploadSchema>
export type CreateMediaAttachment = z.infer<typeof CreateMediaAttachmentSchema>
