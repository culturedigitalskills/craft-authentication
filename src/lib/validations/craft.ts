import { z } from 'zod'

// Owner is NEVER part of the payload — it is resolved server-side from the
// authenticated session's artisan profile.

const mediaIdsField = z.array(z.uuid()).max(50).optional()
const videosField = z.array(z.string().min(1).max(50)).max(50).optional()

export const CreateCraftSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().max(1000).optional(),
    material: z.string().max(100).optional(),
    isPublic: z.boolean().default(false),
    isSharedLocation: z.boolean().default(true),
    latitude: z.number().min(-90).max(90).nullish(),
    longitude: z.number().min(-180).max(180).nullish(),
    place: z.string().max(255).nullish(),
    videos: videosField,
    mediaIds: mediaIdsField,
})

export const UpdateCraftSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255).optional(),
    description: z.string().max(1000).nullish(),
    material: z.string().max(100).nullish(),
    isPublic: z.boolean().optional(),
    isSharedLocation: z.boolean().optional(),
    latitude: z.number().min(-90).max(90).nullish(),
    longitude: z.number().min(-180).max(180).nullish(),
    place: z.string().max(255).nullish(),
    videos: videosField,
    mediaIds: mediaIdsField,
})

export const craftQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).catch(1),
    limit: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .pipe(z.number().int().positive().max(100))
        .catch(21),
    search: z.string().optional(),
})

export type CreateCraft = z.infer<typeof CreateCraftSchema>
export type UpdateCraft = z.infer<typeof UpdateCraftSchema>
export type CraftQuery = z.infer<typeof craftQuerySchema>
