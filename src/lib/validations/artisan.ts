import { z } from 'zod'

const nameField = (label: string) =>
    z.string().min(1, `${label} is required`).max(100).regex(/\D/, `${label} must contain at least one letter`)

const handleField = z.string().max(100).optional()
const websiteField = z.union([z.string().url().max(255), z.literal('')]).optional()
const hashtagsField = z
    .array(z.string().regex(/^[A-Za-z0-9_]{1,50}$/).max(50))
    .max(20)
    .optional()

const socialFields = {
    socialInstagram: handleField,
    socialFacebook: handleField,
    socialTwitter: handleField,
    socialTiktok: handleField,
    socialYoutube: handleField,
    website: websiteField,
    hashtags: hashtagsField,
}

export const CreateArtisanSchema = z.object({
    firstName: nameField('First name'),
    lastName: nameField('Last name'),
    bio: z.string().max(1000).optional(),
    yearsOfExperience: z.number().int().min(0).max(100).optional(),
    learningSource: z.string().max(255).optional(),
    country: z.string().max(100).optional(),
    region: z.string().max(100).optional(),
    ...socialFields,
})

export const UpdateArtisanSchema = z.object({
    firstName: nameField('First name').optional(),
    lastName: nameField('Last name').optional(),
    bio: z.string().max(1000).optional(),
    yearsOfExperience: z.number().int().min(0).max(100).optional(),
    learningSource: z.string().max(255).optional(),
    country: z.string().max(100).nullish(),
    region: z.string().max(100).nullish(),
    ...socialFields,
})

export type CreateArtisan = z.infer<typeof CreateArtisanSchema>
export type UpdateArtisan = z.infer<typeof UpdateArtisanSchema>
