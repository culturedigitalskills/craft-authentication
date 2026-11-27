'use client'

import { useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { forgetAccountInBrowser } from '@/lib/erasure-browser'
import { authClient } from '@/lib/auth-client'
import { getPathname, Link } from '@/i8n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
    userId: string
    email: string
    passwordAccount: boolean
    google: boolean
    fresh: boolean
}

export function DeleteAccountForm({ userId, email, passwordAccount, google, fresh }: Props) {
    const t = useTranslations('accountDeletion')
    const locale = useLocale()
    const [open, setOpen] = useState(false)
    const [password, setPassword] = useState('')
    const [verified, setVerified] = useState(fresh)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    if (!open)
        return (
            <Button variant="outline" onClick={() => setOpen(true)}>
                {t('review')}
            </Button>
        )

    async function submit(event: FormEvent) {
        event.preventDefault()
        if (busy) return
        setBusy(true)
        setError('')
        try {
            const response = await fetch('/api/account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId: userId,
                    confirmation: true,
                    ...(passwordAccount ? { password } : {}),
                }),
            })
            if (!response.ok) {
                const { error: code } = await response.json().catch(() => ({}))
                if (code === 'REAUTH') setVerified(false)
                const message =
                    code === 'LAST_ADMIN'
                        ? 'lastAdmin'
                        : code === 'PASSWORD'
                          ? 'wrongPassword'
                          : response.status === 401
                            ? 'expired'
                            : response.status === 429
                              ? 'rateLimit'
                              : 'failed'
                setError(t(message))
                setBusy(false)
                return
            }
            forgetAccountInBrowser(userId)
            window.location.replace(getPathname({ href: '/account/deleted', locale }))
        } catch {
            setError(t('failed'))
            setBusy(false)
        }
    }

    return (
        <form className="space-y-4" onSubmit={submit}>
            <p className="font-medium">{t('confirm', { email })}</p>
            {passwordAccount && (
                <div className="space-y-2">
                    <Label htmlFor="deletion-password">{t('password')}</Label>
                    <Input
                        type="password"
                        id="deletion-password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            )}
            {!passwordAccount && !verified && google && (
                <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                        setBusy(true)
                        try {
                            const result = await authClient.signIn.social({
                                provider: 'google',
                                callbackURL: getPathname({ href: '/account', locale }),
                            })
                            if (result.error) setError(t('failed'))
                        } catch {
                            setError(t('failed'))
                        } finally {
                            setBusy(false)
                        }
                    }}
                >
                    {t('google')}
                </Button>
            )}
            {error && (
                <p role="alert" className="text-destructive">
                    {error}{' '}
                    <Link className="underline" href="/account/deleted">
                        {t('receipt')}
                    </Link>
                </p>
            )}
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                        setOpen(false)
                        setPassword('')
                        setError('')
                    }}
                >
                    {t('cancel')}
                </Button>
                <Button
                    type="submit"
                    variant="destructive"
                    disabled={busy || (!passwordAccount && (!verified || !google))}
                >
                    {t('delete')}
                </Button>
            </div>
        </form>
    )
}
