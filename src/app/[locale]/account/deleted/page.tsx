'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i8n/navigation'

export default function DeletionStatusPage() {
    const t = useTranslations('accountDeletion')
    const [state, setState] = useState<
        'loading' | 'pending' | 'complete' | 'unavailable' | 'retry'
    >('loading')
    useEffect(() => {
        let active = true
        let timer: ReturnType<typeof setTimeout>
        async function poll() {
            try {
                const response = await fetch('/api/account/erasure-status', { cache: 'no-store' })
                if (!response.ok) throw new Error('status')
                const data = await response.json()
                if (!active) return
                setState(data.status)
                if (data.status !== 'pending') return
            } catch {
                if (!active) return
                setState('retry')
            }
            timer = setTimeout(poll, 5000)
        }
        void poll()
        return () => {
            active = false
            clearTimeout(timer)
        }
    }, [])
    return (
        <div className="sc-container max-w-2xl space-y-4 py-12">
            <h1 className="sc-h2">{t('receipt')}</h1>
            <p aria-live="polite">{t(state)}</p>
            <Link className="underline" href="/">
                {t('home')}
            </Link>
        </div>
    )
}
