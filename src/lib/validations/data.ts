import { z } from 'zod'

export const createDataRecordSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    data: z.any().optional(),
})

export const updateDataRecordSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(255, 'Name must be less than 255 characters')
        .optional(),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    data: z.any().optional(),
})

export const dataQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).catch(1),
    limit: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .pipe(z.number().int().positive().max(100))
        .catch(10),
    search: z.string().optional(),
})

export type CreateDataRecord = z.infer<typeof createDataRecordSchema>
export type UpdateDataRecord = z.infer<typeof updateDataRecordSchema>
export type DataQuery = z.infer<typeof dataQuerySchema>
