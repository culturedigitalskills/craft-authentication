'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/i8n/navigation'

export function HideProfile({ id, hidden }: { id: string; hidden: boolean }) {
    const t = useTranslations('accountDeletion')
    const [busy, setBusy] = useState(false)
    const [failed, setFailed] = useState(false)
    const router = useRouter()
    return (
        <section className="space-y-3 rounded-xl border border-border p-6">
            <h2 className="text-xl font-semibold">{t('hide')}</h2>
            <p>{t(hidden ? 'hidden' : 'hideHint')}</p>
            {!hidden && (
                <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                        setBusy(true)
                        setFailed(false)
                        try {
                            const response = await fetch(
                                '/api/artisans/' + encodeURIComponent(id),
                                { method: 'DELETE' },
                            )
                            if (!response.ok) throw new Error('Hide failed')
                            router.refresh()
                        } catch {
                            setFailed(true)
                        } finally {
                            setBusy(false)
                        }
                    }}
                >
                    {t('hide')}
                </Button>
            )}
            {failed && <p role="alert">{t('failed')}</p>}
        </section>
    )
}
