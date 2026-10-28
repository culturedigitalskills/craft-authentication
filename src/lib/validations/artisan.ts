import { z } from 'zod'

const nameField = (label: string) =>
    z.string().min(1, `${label} is required`).max(100).regex(/\D/, `${label} must contain at least one letter`)

const handleField = z.string().trim().max(100).optional()

// The server requires a full URL — auto-prefix https:// so "yoursite.com"
// passes websiteField. Used by the client forms before submitting.
export function normalizeWebsite(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return ''
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
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

// DELETE /api/artisans/:id — removes a profile, or puts a removed one back.
// Restoring rides the same verb because it is the same decision reversed, and
// the body is optional so a plain DELETE still means "remove".
export const DeleteArtisanSchema = z.object({
    restore: z.boolean().optional().default(false),
})

export type CreateArtisan = z.infer<typeof CreateArtisanSchema>
export type UpdateArtisan = z.infer<typeof UpdateArtisanSchema>
export type DeleteArtisan = z.infer<typeof DeleteArtisanSchema>
