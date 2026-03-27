'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const ORGANIZATION_TYPES = [
    'COOPERATIVE',
    'COLLECTIVE',
    'GUILD',
    'ASSOCIATION',
    'SOCIAL_ENTERPRISE',
    'NONPROFIT',
    'STUDIO',
    'NETWORK',
    'OTHER',
] as const

const CERTIFICATIONS = [
    'WFTO_FAIR_TRADE',
    'FAIRTRADE_CERTIFIED',
    'NEST_ETHICAL_HANDCRAFT',
    'BCORP',
    'UNESCO_ICH',
    'FAIR_TRADE_FEDERATION',
] as const

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
        organizationType: 'OTHER' as string,
        certifications: [] as string[],
        isHeritageCraft: false,
        isOpenToMembers: true,
        hasTrainingProgram: false,
    })

    function toggleCertification(cert: string) {
        setForm(f => ({
            ...f,
            certifications: f.certifications.includes(cert)
                ? f.certifications.filter(c => c !== cert)
                : [...f.certifications, cert],
        }))
    }

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

                {/* Organization type */}
                <div>
                    <label htmlFor="organizationType" className="mb-1.5 block text-sm font-medium">
                        {t('organizationType')}
                    </label>
                    <select
                        id="organizationType"
                        value={form.organizationType}
                        onChange={e => setForm(f => ({ ...f, organizationType: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        {ORGANIZATION_TYPES.map(type => (
                            <option key={type} value={type}>
                                {t(`orgType_${type}`)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Certifications */}
                <div>
                    <p className="mb-2 text-sm font-medium">{t('certifications')}</p>
                    <div className="flex flex-wrap gap-2">
                        {CERTIFICATIONS.map(cert => (
                            <button
                                key={cert}
                                type="button"
                                onClick={() => toggleCertification(cert)}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    form.certifications.includes(cert)
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border text-muted-foreground hover:border-primary/40'
                                }`}
                            >
                                {t(`cert_${cert}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Boolean attributes */}
                <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isHeritageCraft}
                            onChange={e => setForm(f => ({ ...f, isHeritageCraft: e.target.checked }))}
                            className="rounded border-input"
                        />
                        {t('heritageCraft')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isOpenToMembers}
                            onChange={e => setForm(f => ({ ...f, isOpenToMembers: e.target.checked }))}
                            className="rounded border-input"
                        />
                        {t('openToMembers')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.hasTrainingProgram}
                            onChange={e => setForm(f => ({ ...f, hasTrainingProgram: e.target.checked }))}
                            className="rounded border-input"
                        />
                        {t('trainingProgram')}
                    </label>
                </div>

                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        {saving ? 'Creating...' : t('createGroup')}
                    </button>
                </div>
            </form>
        </div>
    )
}
