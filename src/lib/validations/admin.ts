import { z } from 'zod'

// PATCH /api/admin/users/:id — grant or withdraw site admin. Only the two
// roles the enum defines; anything else is a client sending nonsense.
export const UpdateUserRoleSchema = z.object({
    role: z.enum(['ADMIN', 'ARTISAN']),
})

export type UpdateUserRole = z.infer<typeof UpdateUserRoleSchema>
