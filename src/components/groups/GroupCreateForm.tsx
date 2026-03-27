'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
        <Card className="mx-auto max-w-2xl overflow-hidden rounded-2xl shadow-lg">
            <div className="bg-gradient-to-br from-card via-muted/50 to-card px-6 py-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/groups"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-left text-2xl font-bold tracking-tight">
                            {t('createGroup')}
                        </h1>
                        <p className="text-left text-sm text-muted-foreground">
                            {t('createGroupHelper')}
                        </p>
                    </div>
                </div>
            </div>

            <CardContent className="p-6">
                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                            {t('groupName')} *
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                            className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                                className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                                className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
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
                            className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
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

                    <div className="flex justify-end">
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Creating...' : t('createGroup')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
