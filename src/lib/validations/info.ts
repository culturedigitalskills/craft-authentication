import { z } from 'zod'

export const BuildInfoSchema = z.object({
    version: z.string(),
    commitHash: z.string(),
    branch: z.string(),
    created: z.string(),
})

export const InfoResponseSchema = BuildInfoSchema.extend({
    timestamp: z.string(),
})

export type BuildInfo = z.infer<typeof BuildInfoSchema>
export type InfoResponse = z.infer<typeof InfoResponseSchema>
