import { z } from 'zod'

export const CreateArtisanSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    bio: z.string().max(1000).optional(),
    yearsOfExperience: z.number().int().min(0).max(100).optional(),
    learningSource: z.string().max(255).optional(),
    regionId: z.uuid().optional(),
})

export const UpdateArtisanSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    bio: z.string().max(1000).optional(),
    yearsOfExperience: z.number().int().min(0).max(100).optional(),
    learningSource: z.string().max(255).optional(),
    regionId: z.uuid().nullish(),
})

export type CreateArtisan = z.infer<typeof CreateArtisanSchema>
export type UpdateArtisan = z.infer<typeof UpdateArtisanSchema>
