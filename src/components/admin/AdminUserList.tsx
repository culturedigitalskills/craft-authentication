'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertCircle, Loader2, ShieldCheck, ShieldMinus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminUser {
    id: string
    email: string
    name: string | null
    role: string
    artisan: { slug: string; name: string; isRemoved: boolean } | null
}

/**
 * The account roster, with the one action that cannot be taken anywhere else:
 * granting or withdrawing site admin.
 *
 * Removing an artisan is not offered here. That happens on their own profile,
 * where the admin can see whose work they are about to take down rather than
 * picking a row out of a list of email addresses.
 */
export function AdminUserList({
    users,
    currentUserId,
    adminCount,
}: {
    users: AdminUser[]
    currentUserId: string
    adminCount: number
}) {
    const t = useTranslations('admin')
    const router = useRouter()
    const [busy, setBusy] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function setRole(user: AdminUser, role: 'ADMIN' | 'ARTISAN') {
        setBusy(user.id)
        setError(null)
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            })
            if (res.status === 409) {
                setError(t('lastAdmin'))
                return
            }
            if (!res.ok) throw new Error()
            router.refresh()
        } catch {
            setError(t('roleFailed'))
        } finally {
            setBusy(null)
        }
    }

    return (
        <section className="mb-10">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-warm">
                {t('accounts')}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">{t('accountsHint')}</p>

            {error && (
                <p className="mb-3 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </p>
            )}

            <div className="overflow-x-auto">
                <ul className="min-w-[32rem] divide-y divide-border rounded-lg border border-border">
                    {users.map((user) => {
                        const isAdmin = user.role === 'ADMIN'
                        const isSelf = user.id === currentUserId
                        // Withdrawing the last admin would lock everyone out,
                        // and the server refuses it anyway.
                        const isLastAdmin = isAdmin && adminCount <= 1

                        return (
                            <li
                                key={user.id}
                                className="flex flex-wrap items-center justify-between gap-3 p-3"
                            >
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 text-sm font-medium">
                                        {isAdmin ? (
                                            <ShieldCheck className="h-4 w-4 shrink-0 text-warm" />
                                        ) : (
                                            <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        )}
                                        <span className="truncate">{user.email}</span>
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {user.artisan ? (
                                            <Link
                                                href={`/artisans/${user.artisan.slug}`}
                                                className="underline underline-offset-2"
                                            >
                                                {user.artisan.name}
                                            </Link>
                                        ) : (
                                            t('noProfile')
                                        )}
                                        {user.artisan?.isRemoved && ` · ${t('profileRemoved')}`}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isSelf && (
                                        <span className="text-xs text-muted-foreground">
                                            {t('you')}
                                        </span>
                                    )}
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={isAdmin ? 'outline' : 'default'}
                                        disabled={busy === user.id || (isAdmin && isLastAdmin)}
                                        title={isAdmin && isLastAdmin ? t('lastAdmin') : undefined}
                                        onClick={() =>
                                            void setRole(user, isAdmin ? 'ARTISAN' : 'ADMIN')
                                        }
                                    >
                                        {busy === user.id ? (
                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        ) : isAdmin ? (
                                            <ShieldMinus className="mr-1.5 h-4 w-4" />
                                        ) : (
                                            <ShieldCheck className="mr-1.5 h-4 w-4" />
                                        )}
                                        {isAdmin ? t('withdrawAdmin') : t('makeAdmin')}
                                    </Button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </section>
    )
}
