'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

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
            <div className="bg-primary px-6 py-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/groups"
                        className="rounded-md p-2 text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-left text-2xl font-bold tracking-tight text-primary-foreground">
                            {t('createGroup')}
                        </h1>
                        <p className="text-left text-sm text-primary-foreground/70">
                            {t('createGroupHelper')}
                        </p>
                    </div>
                </div>
            </div>

            <CardContent className="p-6">
                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="name">
                            {t('groupName')} *
                        </Label>
                        <Input
                            id="name"
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">
                            {t('description')}
                        </Label>
                        <Textarea
                            id="description"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={4}
                        />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="website">
                                {t('website')}
                            </Label>
                            <Input
                                id="website"
                                type="url"
                                value={form.website}
                                onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                                placeholder="https://"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">
                                {t('location')}
                            </Label>
                            <Input
                                id="location"
                                type="text"
                                value={form.location}
                                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="organizationType">
                            {t('organizationType')}
                        </Label>
                        <Select
                            value={form.organizationType}
                            onValueChange={value => setForm(f => ({ ...f, organizationType: value }))}
                        >
                            <SelectTrigger id="organizationType">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ORGANIZATION_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>
                                        {t(`orgType_${type}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

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
