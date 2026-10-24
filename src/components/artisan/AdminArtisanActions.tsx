'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle, Loader2, ShieldAlert, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface AdminArtisanActionsProps {
    artisanId: string
    artisanName: string
    isRemoved: boolean
}

/**
 * Site-admin controls shown on an artisan's own public page, so moderation
 * happens where the admin already is rather than behind a separate console.
 *
 * Removal is reversible and only hides the profile, which is why this panel
 * also renders for an already removed artisan: that page is reachable by an
 * admin alone, and it is the only route back.
 */
export function AdminArtisanActions({
    artisanId,
    artisanName,
    isRemoved,
}: AdminArtisanActionsProps) {
    const t = useTranslations('artisanProfile.adminActions')
    const router = useRouter()
    const [confirming, setConfirming] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function submit(restore: boolean) {
        setBusy(true)
        setError(null)
        try {
            const res = await fetch(`/api/artisans/${artisanId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restore }),
            })
            if (!res.ok) throw new Error()
            setConfirming(false)
            // The page is a server component, so the banner, the crafts and the
            // membership lists all re-resolve from the new state.
            router.refresh()
        } catch {
            setError(t('failed'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            className="mb-6 rounded-[var(--sc-r-card)] p-4"
            style={{
                border: '1px solid var(--sc-border)',
                background: 'var(--sc-surface-trans)',
            }}
        >
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                <ShieldAlert className="h-4 w-4" />
                {t('title')}
            </p>

            <p className="mb-3 text-sm text-muted-foreground">
                {isRemoved ? t('removedExplainer') : t('liveExplainer')}
            </p>

            {isRemoved ? (
                <Button type="button" size="sm" onClick={() => void submit(true)} disabled={busy}>
                    {busy ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                        <Undo2 className="mr-1.5 h-4 w-4" />
                    )}
                    {t('restore')}
                </Button>
            ) : (
                <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirming(true)}
                    disabled={busy}
                >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    {t('remove')}
                </Button>
            )}

            {error && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </p>
            )}

            {/* Removal reaches past the profile to the artisan's crafts and
                their place in every group, so the dialog says so rather than
                asking to confirm an action whose extent is not visible. */}
            <Dialog open={confirming} onOpenChange={setConfirming}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('confirmTitle', { name: artisanName })}</DialogTitle>
                        <DialogDescription>{t('confirmBody')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirming(false)}
                            disabled={busy}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => void submit(false)}
                            disabled={busy}
                        >
                            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                            {t('confirmRemove')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
