'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function GroupCreateForm() {
    const t = useTranslations('groups')
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [form, setForm] = useState({
        name: '',
        description: '',
        website: '',
        location: '',
        isWomenLed: false,
        isCooperative: false,
        isFairTrade: false,
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setError('')

        try {
            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })

            if (!res.ok) {
                const data = await res.json()
                setError(data.error || t('saveFailed'))
                return
            }

            const group = await res.json()
            router.push(`/groups/${group.slug}`)
        } catch {
            setError(t('saveFailed'))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-6 flex items-center gap-4">
                <Link
                    href="/groups"
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold">{t('createGroup')}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-border bg-card p-6">
                <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                        {t('groupName')} *
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
                        {t('description')}
                    </label>
                    <textarea
                        id="description"
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        rows={4}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="website" className="mb-1.5 block text-sm font-medium">
                            {t('website')}
                        </label>
                        <input
                            id="website"
                            type="url"
                            value={form.website}
                            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                            placeholder="https://"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="location" className="mb-1.5 block text-sm font-medium">
                            {t('location')}
                        </label>
                        <input
                            id="location"
                            type="text"
                            value={form.location}
                            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isWomenLed}
                            onChange={e => setForm(f => ({ ...f, isWomenLed: e.target.checked }))}
                            className="rounded border-input"
                        />
                        {t('womenLed')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isCooperative}
                            onChange={e => setForm(f => ({ ...f, isCooperative: e.target.checked }))}
                            className="rounded border-input"
                        />
                        {t('cooperative')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isFairTrade}
                            onChange={e => setForm(f => ({ ...f, isFairTrade: e.target.checked }))}
                            className="rounded border-input"
                        />
                        {t('fairTrade')}
                    </label>
                </div>

                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                    {saving ? 'Creating...' : t('createGroup')}
                </button>
            </form>
        </div>
    )
}
