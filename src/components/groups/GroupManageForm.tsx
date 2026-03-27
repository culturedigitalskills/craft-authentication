'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Trash2, UserPlus, Shield, User, ArrowLeft } from 'lucide-react'
import { GroupPhotoUpload } from './GroupPhotoUpload'

interface GroupData {
    id: string
    name: string
    slug: string
    description: string | null
    website: string | null
    location: string | null
    organizationType: string
    certifications: string[]
    isHeritageCraft: boolean
    isOpenToMembers: boolean
    hasTrainingProgram: boolean
}

interface Member {
    id: string
    role: string
    artisan: {
        id: string
        firstName: string
        lastName: string
        slug: string
    }
}

interface GroupManageFormProps {
    group: GroupData
    members: Member[]
    logoUrl: string | null
    coverUrl: string | null
}

export function GroupManageForm({ group, members: initialMembers, logoUrl, coverUrl }: GroupManageFormProps) {
    const t = useTranslations('groups')
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [members, setMembers] = useState(initialMembers)
    const [addError, setAddError] = useState('')
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<{ id: string; firstName: string; lastName: string; slug: string }[]>([])
    const [selectedArtisan, setSelectedArtisan] = useState<{ id: string; firstName: string; lastName: string } | null>(null)
    const [searching, setSearching] = useState(false)

    const [form, setForm] = useState({
        name: group.name,
        description: group.description || '',
        website: group.website || '',
        location: group.location || '',
        organizationType: group.organizationType,
        certifications: group.certifications,
        isHeritageCraft: group.isHeritageCraft,
        isOpenToMembers: group.isOpenToMembers,
        hasTrainingProgram: group.hasTrainingProgram,
    })

    function toggleCertification(cert: string) {
        setForm(f => ({
            ...f,
            certifications: f.certifications.includes(cert)
                ? f.certifications.filter(c => c !== cert)
                : [...f.certifications, cert],
        }))
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch(`/api/groups/${group.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (!res.ok) throw new Error('Failed to save')
            router.refresh()
        } catch {
            alert(t('saveFailed'))
        } finally {
            setSaving(false)
        }
    }

    async function handleSearch(query: string) {
        setSearchQuery(query)
        setSelectedArtisan(null)
        setAddError('')

        if (query.trim().length < 2) {
            setSearchResults([])
            return
        }

        setSearching(true)
        try {
            const res = await fetch(`/api/artisans/search?q=${encodeURIComponent(query.trim())}`)
            if (res.ok) {
                const results = await res.json()
                // Filter out artisans already in the group
                const memberIds = new Set(members.map(m => m.artisan.id))
                setSearchResults(results.filter((a: { id: string }) => !memberIds.has(a.id)))
            }
        } catch {
            // silently fail search
        } finally {
            setSearching(false)
        }
    }

    async function handleAddMember() {
        if (!selectedArtisan) return
        setAddError('')

        try {
            const res = await fetch(`/api/groups/${group.id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ artisanId: selectedArtisan.id }),
            })
            if (!res.ok) {
                const data = await res.json()
                setAddError(data.error || 'Failed to add member')
                return
            }
            const membership = await res.json()
            setMembers(prev => [...prev, membership])
            setSelectedArtisan(null)
            setSearchQuery('')
            setSearchResults([])
        } catch {
            setAddError('Failed to add member')
        }
    }

    async function handleRemoveMember(membershipId: string) {
        try {
            const res = await fetch(`/api/groups/${group.id}/members/${membershipId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Failed to remove')
            setMembers(prev => prev.filter(m => m.id !== membershipId))
            setConfirmRemove(null)
        } catch {
            alert('Failed to remove member')
        }
    }

    async function handleToggleRole(membershipId: string, currentRole: string) {
        const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN'
        try {
            const res = await fetch(`/api/groups/${group.id}/members/${membershipId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            })
            if (!res.ok) throw new Error('Failed to update role')
            setMembers(prev =>
                prev.map(m => m.id === membershipId ? { ...m, role: newRole } : m)
            )
        } catch {
            alert('Failed to update role')
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/groups/${group.slug}`}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">{t('editGroup')}: {group.name}</h1>
            </div>

            {/* Photos */}
            <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold">Photos</h2>
                <div className="space-y-5">
                    <GroupPhotoUpload
                        groupId={group.id}
                        currentUrl={coverUrl}
                        attachmentType="COVER"
                        label="Cover Photo"
                    />
                    <GroupPhotoUpload
                        groupId={group.id}
                        currentUrl={logoUrl}
                        attachmentType="HERO"
                        label="Logo"
                    />
                </div>
            </div>

            {/* Group details form */}
            <form onSubmit={handleSave} className="space-y-5 rounded-lg border border-border bg-card p-6">
                <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                        {t('groupName')}
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
                        {(['COOPERATIVE', 'COLLECTIVE', 'GUILD', 'ASSOCIATION', 'SOCIAL_ENTERPRISE', 'NONPROFIT', 'STUDIO', 'NETWORK', 'OTHER'] as const).map(type => (
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
                        {(['WFTO_FAIR_TRADE', 'FAIRTRADE_CERTIFIED', 'NEST_ETHICAL_HANDCRAFT', 'BCORP', 'UNESCO_ICH', 'FAIR_TRADE_FEDERATION'] as const).map(cert => (
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
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : t('editGroup')}
                    </button>
                </div>
            </form>

            {/* Members management */}
            <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold">{t('members')}</h2>

                {/* Add member */}
                <div className="mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            value={selectedArtisan ? `${selectedArtisan.firstName} ${selectedArtisan.lastName}` : searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder={t('searchArtisan')}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        {searching && (
                            <div className="absolute right-3 top-2.5 text-xs text-muted-foreground">...</div>
                        )}
                        {searchResults.length > 0 && !selectedArtisan && (
                            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
                                {searchResults.map(a => (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedArtisan({ id: a.id, firstName: a.firstName, lastName: a.lastName })
                                            setSearchResults([])
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                                    >
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        {a.firstName} {a.lastName}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {selectedArtisan && (
                        <div className="mt-2 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleAddMember}
                                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                                <UserPlus className="h-4 w-4" />
                                {t('addMember')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setSelectedArtisan(null); setSearchQuery('') }}
                                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    )}
                </div>
                {addError && (
                    <p className="mb-4 text-sm text-destructive">{addError}</p>
                )}

                {/* Members list */}
                <div className="space-y-2">
                    {members.map(member => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between rounded-md border border-border p-3"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                    {member.role === 'ADMIN' ? (
                                        <Shield className="h-4 w-4 text-primary" />
                                    ) : (
                                        <User className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </div>
                                <div>
                                    <Link
                                        href={`/artisans/${member.artisan.slug}`}
                                        className="text-sm font-medium hover:text-primary"
                                    >
                                        {member.artisan.firstName} {member.artisan.lastName}
                                    </Link>
                                    <p className="text-xs text-muted-foreground">
                                        {member.role === 'ADMIN' ? t('admin') : t('member')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleToggleRole(member.id, member.role)}
                                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title={member.role === 'ADMIN' ? 'Demote to member' : 'Promote to admin'}
                                >
                                    {member.role === 'ADMIN' ? (
                                        <User className="h-4 w-4" />
                                    ) : (
                                        <Shield className="h-4 w-4" />
                                    )}
                                </button>

                                {confirmRemove === member.id ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="rounded-md bg-destructive px-2.5 py-1.5 text-xs font-medium text-destructive-foreground"
                                        >
                                            {t('removeMember')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmRemove(null)}
                                            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmRemove(member.id)}
                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {members.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">{t('noMembers')}</p>
                    )}
                </div>
            </div>
        </div>
    )
}
