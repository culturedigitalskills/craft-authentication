import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { errorResponse, handleValidationError } from '@/lib/validations/types'
import { UpdateUserRoleSchema } from '@/lib/validations/admin'
import { recordAdminAction } from '@/lib/admin-audit'

/**
 * Grant or withdraw site admin.
 *
 * Admin is held on the User, not the Artisan, so this acts on the account: an
 * admin need not be an artisan at all. Only an admin may call it, which makes
 * the first one a bootstrapping problem, solved by the migration that promoted
 * a named account rather than by anything reachable over the web.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { session, unauthorized } = await requireAdmin()
    if (unauthorized) return unauthorized

    try {
        const { id } = await params
        const { role } = UpdateUserRoleSchema.parse(await request.json())

        const target = await prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, role: true },
        })
        if (!target) return errorResponse('Account not found', 404)

        if (target.role === role) {
            return NextResponse.json({ id: target.id, role: target.role })
        }

        // Withdrawing the last admin would lock everybody out of this endpoint,
        // and with no database access the only way back would be another
        // migration and a deploy. Counted inside the write so two admins
        // demoting each other at once cannot both pass the check.
        if (role === 'ARTISAN') {
            const remaining = await prisma.user.count({
                where: { role: 'ADMIN', id: { not: target.id } },
            })
            if (remaining === 0) {
                return NextResponse.json(
                    {
                        error: 'LAST_ADMIN',
                        message:
                            'This is the only admin left. Promote somebody else before withdrawing this one.',
                    },
                    { status: 409 },
                )
            }
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { role },
            select: { id: true, role: true },
        })

        await recordAdminAction({
            actor: { id: session!.user.id, email: session!.user.email ?? '' },
            action: role === 'ADMIN' ? 'user.promote' : 'user.demote',
            entityType: 'User',
            entityId: target.id,
            detail: { email: target.email, from: target.role, to: role },
        })

        return NextResponse.json(updated)
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Error changing account role:', error)
        return errorResponse('Failed to change role', 500)
    }
}
