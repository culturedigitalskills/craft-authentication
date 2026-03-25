import { z } from 'zod'

export const CreateGroupSchema = z.object({
    name: z.string().min(1, 'Group name is required').max(200),
    description: z.string().max(2000).optional(),
    website: z.string().url('Must be a valid URL').max(500).optional().or(z.literal('')),
    location: z.string().max(255).optional(),
    isWomenLed: z.boolean().default(false),
    isCooperative: z.boolean().default(false),
    isFairTrade: z.boolean().default(false),
})

export const UpdateGroupSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    website: z.string().url('Must be a valid URL').max(500).optional().or(z.literal('')),
    location: z.string().max(255).optional(),
    isWomenLed: z.boolean().optional(),
    isCooperative: z.boolean().optional(),
    isFairTrade: z.boolean().optional(),
    isActive: z.boolean().optional(),
})

export const AddGroupMemberSchema = z.object({
    artisanId: z.string().uuid('Invalid artisan ID'),
    role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
})

export const UpdateGroupMemberSchema = z.object({
    role: z.enum(['ADMIN', 'MEMBER']),
})

export type CreateGroup = z.infer<typeof CreateGroupSchema>
export type UpdateGroup = z.infer<typeof UpdateGroupSchema>
export type AddGroupMember = z.infer<typeof AddGroupMemberSchema>
export type UpdateGroupMember = z.infer<typeof UpdateGroupMemberSchema>
