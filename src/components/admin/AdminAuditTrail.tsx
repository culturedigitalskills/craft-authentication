import { useTranslations, useFormatter } from 'next-intl'
import { History } from 'lucide-react'

interface AuditEntry {
    id: string
    actorEmail: string
    action: string
    detail: Record<string, unknown> | null
    createdAt: string
}

/**
 * What admins have done to other people's accounts and work.
 *
 * Read-only and append-only by design: the value of a trail is that nobody
 * using it can tidy it, so there is nothing to press here.
 */
export function AdminAuditTrail({ entries }: { entries: AuditEntry[] }) {
    const t = useTranslations('admin')
    const format = useFormatter()

    return (
        <section>
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-warm">
                <History className="h-4 w-4" />
                {t('auditTitle')}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">{t('auditHint')}</p>

            {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('auditEmpty')}</p>
            ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                    {entries.map((entry) => {
                        const subject =
                            (entry.detail?.name as string) ??
                            (entry.detail?.email as string) ??
                            ''
                        return (
                            <li key={entry.id} className="flex flex-wrap gap-x-2 gap-y-1 p-3 text-sm">
                                <span className="font-medium">{entry.actorEmail}</span>
                                {/* The action key doubles as the message key, so
                                    an action added later without copy shows its
                                    own name rather than an empty line. */}
                                <span className="text-muted-foreground">
                                    {t.has(`actions.${entry.action}`)
                                        ? t(`actions.${entry.action}`)
                                        : entry.action}
                                </span>
                                {subject && <span className="font-medium">{subject}</span>}
                                <span className="ml-auto text-xs text-muted-foreground">
                                    {format.dateTime(new Date(entry.createdAt), {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    })}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
