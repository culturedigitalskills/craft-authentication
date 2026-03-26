'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Trash2, UserPlus, Shield, User, ArrowLeft } from 'lucide-react'

interface GroupData {
    id: string
    name: string
    slug: string
    description: string | null
    website: string | null
    location: string | null
    isWomenLed: boolean
    isCooperative: boolean
    isFairTrade: boolean
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
}

export function GroupManageForm({ group, members: initialMembers }: GroupManageFormProps) {
    const t = useTranslations('groups')
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [members, setMembers] = useState(initialMembers)
    const [addArtisanId, setAddArtisanId] = useState('')
    const [addError, setAddError] = useState('')
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

    const [form, setForm] = useState({
        name: group.name,
        description: group.description || '',
        website: group.website || '',
        location: group.location || '',
        isWomenLed: group.isWomenLed,
        isCooperative: group.isCooperative,
        isFairTrade: group.isFairTrade,
    })

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

    async function handleAddMember(e: React.FormEvent) {
        e.preventDefault()
        setAddError('')
        if (!addArtisanId.trim()) return

        try {
            const res = await fetch(`/api/groups/${group.id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ artisanId: addArtisanId.trim() }),
            })
            if (!res.ok) {
                const data = await res.json()
                setAddError(data.error || 'Failed to add member')
                return
            }
            const membership = await res.json()
            setMembers(prev => [...prev, membership])
            setAddArtisanId('')
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
                <h1 className="text-2xl font-bold">{t('editGroup')}: {group.name}</h1>
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

                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : t('editGroup')}
                </button>
            </form>

            {/* Members management */}
            <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold">{t('members')}</h2>

                {/* Add member */}
                <form onSubmit={handleAddMember} className="mb-6 flex gap-3">
                    <input
                        type="text"
                        value={addArtisanId}
                        onChange={e => { setAddArtisanId(e.target.value); setAddError('') }}
                        placeholder="Artisan ID"
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        <UserPlus className="h-4 w-4" />
                        {t('addMember')}
                    </button>
                </form>
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
