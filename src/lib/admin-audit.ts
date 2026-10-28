import { prisma } from '@/lib/prisma'

/**
 * Record a site admin acting on somebody else's account or work.
 *
 * On a platform whose product is provenance, "who removed this?" is a question
 * that will eventually be asked, and the change itself leaves no trace of who
 * made it. Writing is best effort: an audit entry must never be the reason a
 * moderation action fails, so a failure here is logged and swallowed.
 */
export type AdminAction =
    | 'artisan.remove'
    | 'artisan.restore'
    | 'user.promote'
    | 'user.demote'

export async function recordAdminAction(params: {
    actor: { id: string; email: string }
    action: AdminAction
    entityType: 'Artisan' | 'User'
    entityId: string
    detail?: Record<string, unknown>
}): Promise<void> {
    try {
        await prisma.adminAuditLog.create({
            data: {
                actorUserId: params.actor.id,
                // Copied rather than joined, so the entry still names someone
                // after that account is gone.
                actorEmail: params.actor.email,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                detail: (params.detail ?? {}) as object,
            },
        })
    } catch (error) {
        console.error('Failed to record admin action', params.action, error)
    }
}
