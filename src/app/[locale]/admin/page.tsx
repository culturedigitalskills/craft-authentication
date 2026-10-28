import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth-guard'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminUserList } from '@/components/admin/AdminUserList'
import { AdminAuditTrail } from '@/components/admin/AdminAuditTrail'

// Small platform, so the whole roster fits on one screen. A cap rather than
// pagination, which would be scaffolding for a scale this does not have yet.
const ROSTER_LIMIT = 200
const AUDIT_LIMIT = 25

export default async function AdminPage() {
    const session = await requireAdminSession()
    const t = await getTranslations('admin')

    const [users, auditEntries] = await Promise.all([
        prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                artisan: {
                    select: {
                        id: true,
                        slug: true,
                        firstName: true,
                        lastName: true,
                        deletedAt: true,
                    },
                },
            },
            orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
            take: ROSTER_LIMIT,
        }),
        prisma.adminAuditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: AUDIT_LIMIT,
        }),
    ])

    const adminCount = users.filter((u) => u.role === 'ADMIN').length

    return (
        <Container>
            <PageHeader title={t('title')} description={t('description')} />

            <AdminUserList
                currentUserId={session.user.id}
                adminCount={adminCount}
                users={users.map((u) => ({
                    id: u.id,
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    artisan: u.artisan
                        ? {
                              slug: u.artisan.slug,
                              name: `${u.artisan.firstName} ${u.artisan.lastName}`.trim(),
                              isRemoved: Boolean(u.artisan.deletedAt),
                          }
                        : null,
                }))}
            />

            <AdminAuditTrail
                entries={auditEntries.map((entry) => ({
                    id: entry.id,
                    actorEmail: entry.actorEmail,
                    action: entry.action,
                    detail: entry.detail as Record<string, unknown> | null,
                    createdAt: entry.createdAt.toISOString(),
                }))}
            />
        </Container>
    )
}
