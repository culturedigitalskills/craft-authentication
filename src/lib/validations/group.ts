import { z } from 'zod'

const OrganizationTypeEnum = z.enum([
    'COOPERATIVE',
    'COLLECTIVE',
    'GUILD',
    'ASSOCIATION',
    'SOCIAL_ENTERPRISE',
    'NONPROFIT',
    'STUDIO',
    'NETWORK',
    'OTHER',
])

const CertificationEnum = z.enum([
    'WFTO_FAIR_TRADE',
    'FAIRTRADE_CERTIFIED',
    'NEST_ETHICAL_HANDCRAFT',
    'BCORP',
    'UNESCO_ICH',
    'FAIR_TRADE_FEDERATION',
])

export const CreateGroupSchema = z.object({
    name: z.string().min(1, 'Group name is required').max(200),
    description: z.string().max(2000).optional(),
    website: z.string().url('Must be a valid URL').max(500).optional().or(z.literal('')),
    location: z.string().max(255).optional(),
    organizationType: OrganizationTypeEnum.default('OTHER'),
    certifications: z.array(CertificationEnum).default([]),
    isHeritageCraft: z.boolean().default(false),
    isOpenToMembers: z.boolean().default(true),
    hasTrainingProgram: z.boolean().default(false),
})

export const UpdateGroupSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    website: z.string().url('Must be a valid URL').max(500).optional().or(z.literal('')),
    location: z.string().max(255).optional(),
    organizationType: OrganizationTypeEnum.optional(),
    certifications: z.array(CertificationEnum).optional(),
    isHeritageCraft: z.boolean().optional(),
    isOpenToMembers: z.boolean().optional(),
    hasTrainingProgram: z.boolean().optional(),
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
