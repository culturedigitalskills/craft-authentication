'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ProfilePhotoUpload } from './ProfilePhotoUpload'
import { CoverPhotoUpload } from './CoverPhotoUpload'
import { GalleryUpload } from './GalleryUpload'
import { LocationSelect } from './LocationSelect'
import { CraftStoryBanner, type CraftStoryBannerProps } from './CraftStoryBanner'
import {
    ArrowLeft,
    MapPin,
    Clock,
    GraduationCap,
    User,
    Pencil,
    ExternalLink,
    Users,
    Shield,
    LogOut,
    Loader2,
    Globe,
    Hash,
    X,
} from 'lucide-react'
import { FaInstagram, FaFacebook, FaXTwitter, FaYoutube, FaTiktok } from 'react-icons/fa6'

interface Artisan {
    id: string
    firstName: string
    lastName: string
    slug: string
    bio: string | null
    yearsOfExperience: number | null
    learningSource: string | null
    country: string | null
    region: string | null
    socialInstagram: string | null
    socialFacebook: string | null
    socialTwitter: string | null
    socialTiktok: string | null
    socialYoutube: string | null
    website: string | null
    hashtags: string[]
}

interface GalleryImage {
    id: string
    mediaId: string
    url: string
}

interface MyGroup {
    membershipId: string
    role: string
    group: { id: string; name: string; slug: string }
}

interface ArtisanProfileFormProps {
    artisan: Artisan | null
    photoUrl: string | null
    coverUrl: string | null
    galleryImages: GalleryImage[]
    myGroups?: MyGroup[]
    storyBanner?: CraftStoryBannerProps
}

export function ArtisanProfileForm({
    artisan,
    photoUrl,
    coverUrl,
    galleryImages,
    myGroups = [],
    storyBanner,
}: ArtisanProfileFormProps) {
    const t = useTranslations('profile')
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const [firstName, setFirstName] = useState(artisan?.firstName ?? '')
    const [lastName, setLastName] = useState(artisan?.lastName ?? '')
    const [bio, setBio] = useState(artisan?.bio ?? '')
    const [yearsOfExperience, setYearsOfExperience] = useState(
        artisan?.yearsOfExperience?.toString() ?? '',
    )
    const [learningSource, setLearningSource] = useState(artisan?.learningSource ?? '')
    const [country, setCountry] = useState<string | null>(artisan?.country ?? null)
    const [region, setRegion] = useState<string | null>(artisan?.region ?? null)
    const [uploadedPhotoId, setUploadedPhotoId] = useState<string | null>(null)
    const [uploadedCoverId, setUploadedCoverId] = useState<string | null>(null)
    const [groups, setGroups] = useState(myGroups)
    const [confirmLeave, setConfirmLeave] = useState<string | null>(null)
    const [socialInstagram, setSocialInstagram] = useState(artisan?.socialInstagram ?? '')
    const [socialFacebook, setSocialFacebook] = useState(artisan?.socialFacebook ?? '')
    const [socialTwitter, setSocialTwitter] = useState(artisan?.socialTwitter ?? '')
    const [socialTiktok, setSocialTiktok] = useState(artisan?.socialTiktok ?? '')
    const [socialYoutube, setSocialYoutube] = useState(artisan?.socialYoutube ?? '')
    const [website, setWebsite] = useState(artisan?.website ?? '')
    const [hashtags, setHashtags] = useState<string[]>(artisan?.hashtags ?? [])
    const [hashtagInput, setHashtagInput] = useState('')

    const isCreateMode = !artisan
    const showForm = isCreateMode || isEditing

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        const data: Record<string, unknown> = {
            firstName,
            lastName,
        }
        if (bio) data.bio = bio
        if (yearsOfExperience) data.yearsOfExperience = parseInt(yearsOfExperience, 10)
        if (learningSource) data.learningSource = learningSource
        if (country) data.country = country
        if (region) data.region = region
        if (socialInstagram) data.socialInstagram = socialInstagram.replace(/^@/, '')
        if (socialFacebook) data.socialFacebook = socialFacebook.replace(/^@/, '')
        if (socialTwitter) data.socialTwitter = socialTwitter.replace(/^@/, '')
        if (socialTiktok) data.socialTiktok = socialTiktok.replace(/^@/, '')
        if (socialYoutube) data.socialYoutube = socialYoutube.replace(/^@/, '')
        if (website) data.website = website
        data.hashtags = hashtags

        try {
            const url = isCreateMode ? '/api/artisans' : `/api/artisans/${artisan.id}`
            const method = isCreateMode ? 'POST' : 'PUT'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (!res.ok) throw new Error('Request failed')

            if (isCreateMode) {
                const newArtisan = await res.json()
                const attachmentPromises = []

                if (uploadedPhotoId) {
                    attachmentPromises.push(
                        fetch('/api/media/attachments', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                mediaId: uploadedPhotoId,
                                entityType: 'Artisan',
                                entityId: newArtisan.id,
                                attachmentType: 'HERO',
                                isPrimary: true,
                            }),
                        }),
                    )
                }

                if (uploadedCoverId) {
                    attachmentPromises.push(
                        fetch('/api/media/attachments', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                mediaId: uploadedCoverId,
                                entityType: 'Artisan',
                                entityId: newArtisan.id,
                                attachmentType: 'COVER',
                                isPrimary: true,
                            }),
                        }),
                    )
                }

                await Promise.all(attachmentPromises)
                router.push(`/artisans/${newArtisan.slug}`)
                return
            }

            router.push(`/artisans/${artisan.slug}`)
        } catch {
            setMessage({
                text: isCreateMode ? t('createFailed') : t('updateFailed'),
                type: 'error',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    function handleCancelEdit() {
        setIsEditing(false)
        setFirstName(artisan?.firstName ?? '')
        setLastName(artisan?.lastName ?? '')
        setBio(artisan?.bio ?? '')
        setYearsOfExperience(artisan?.yearsOfExperience?.toString() ?? '')
        setLearningSource(artisan?.learningSource ?? '')
        setCountry(artisan?.country ?? null)
        setRegion(artisan?.region ?? null)
        setSocialInstagram(artisan?.socialInstagram ?? '')
        setSocialFacebook(artisan?.socialFacebook ?? '')
        setSocialTwitter(artisan?.socialTwitter ?? '')
        setSocialTiktok(artisan?.socialTiktok ?? '')
        setSocialYoutube(artisan?.socialYoutube ?? '')
        setWebsite(artisan?.website ?? '')
        setHashtags(artisan?.hashtags ?? [])
        setHashtagInput('')
        setMessage(null)
    }

    function addHashtag() {
        const tag = hashtagInput.replace(/^#/, '').trim()
        if (
            tag &&
            /^[A-Za-z0-9_]{1,50}$/.test(tag) &&
            !hashtags.includes(tag) &&
            hashtags.length < 20
        ) {
            setHashtags((prev) => [...prev, tag])
        }
        setHashtagInput('')
    }

    async function handleLeaveGroup(membershipId: string, groupId: string) {
        try {
            const res = await fetch(`/api/groups/${groupId}/members/${membershipId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Failed to leave group')
            setGroups((prev) => prev.filter((g) => g.membershipId !== membershipId))
            setConfirmLeave(null)
        } catch {
            alert(t('leaveGroupFailed'))
        }
    }

    const locationText =
        artisan?.region && artisan?.country ? `${artisan.region}, ${artisan.country}` : null

    // ── View mode — scroll sections layout ──
    if (!showForm && artisan) {
        return (
            <div>
                {/* ── Hero Banner ── */}
                <section className="relative overflow-hidden border-b border-border/50 bg-muted/60 pb-14 pt-12">
                    {coverUrl ? (
                        <Image
                            src={coverUrl}
                            alt="Cover photo"
                            fill
                            sizes="100vw"
                            className="object-cover"
                            unoptimized // <-- Preserves C2PA manifest
                        />
                    ) : (
                        <>
                            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl" />
                            <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/[0.07] blur-3xl" />
                        </>
                    )}
                    {coverUrl && (
                        <div
                            className="absolute inset-0"
                            style={{ backgroundColor: 'oklch(0.08 0.01 250 / 0.4)' }}
                        />
                    )}

                    <div className="relative mx-auto max-w-4xl px-4 text-center">
                        {/* Avatar */}
                        <div className="mx-auto mb-4 h-28 w-28 overflow-hidden rounded-full border-4 border-background shadow-xl sm:h-32 sm:w-32">
                            {photoUrl ? (
                                <Image
                                    src={photoUrl}
                                    alt={`${artisan.firstName} ${artisan.lastName}`}
                                    width={128}
                                    height={128}
                                    className="h-full w-full object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-muted">
                                    <User className="h-10 w-10 text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        <h1
                            className={`text-2xl font-bold tracking-tight sm:text-3xl ${coverUrl ? 'text-white' : ''}`}
                        >
                            {artisan.firstName} {artisan.lastName}
                        </h1>

                        {locationText && (
                            <p
                                className={`mt-1.5 inline-flex items-center gap-1.5 text-sm ${coverUrl ? 'text-white/80' : 'text-muted-foreground'}`}
                            >
                                <MapPin className="h-4 w-4" />
                                {locationText}
                            </p>
                        )}

                        <div className="mt-4 flex flex-wrap justify-center gap-3">
                            <Button onClick={() => setIsEditing(true)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t('edit')}
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={`/artisans/${artisan.slug}`}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    {t('publicProfileLink')}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {message && (
                    <div className="mx-auto max-w-4xl px-4">
                        <div
                            className={`mt-6 rounded-lg p-3 text-sm ${
                                message.type === 'success'
                                    ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                                    : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                            }`}
                        >
                            {message.text}
                        </div>
                    </div>
                )}

                {/* ── Stats Section ── */}
                <section className="border-b border-border/50 bg-background py-8">
                    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 px-4 sm:grid-cols-3">
                        {artisan.yearsOfExperience !== null && (
                            <div className="rounded-lg bg-muted/60 p-5 text-center">
                                <Clock className="mx-auto mb-2 h-6 w-6 text-warm" />
                                <p className="font-semibold">
                                    {artisan.yearsOfExperience} {t('yearsLabel')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t('craftExperience')}
                                </p>
                            </div>
                        )}
                        {artisan.learningSource && (
                            <div className="rounded-lg bg-muted/60 p-5 text-center">
                                <GraduationCap className="mx-auto mb-2 h-6 w-6 text-warm" />
                                <p className="font-semibold">{artisan.learningSource}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t('learningSource')}
                                </p>
                            </div>
                        )}
                        {locationText && (
                            <div className="rounded-lg bg-muted/60 p-5 text-center">
                                <MapPin className="mx-auto mb-2 h-6 w-6 text-warm" />
                                <p className="font-semibold">{locationText}</p>
                                <p className="text-xs text-muted-foreground">{t('location')}</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Craft Story Banner ── */}
                {storyBanner && (
                    <section className="bg-background py-6">
                        <div className="mx-auto max-w-3xl px-4">
                            <CraftStoryBanner {...storyBanner} />
                        </div>
                    </section>
                )}

                {/* ── About Section ── */}
                {artisan.bio && (
                    <section className="bg-muted/40 py-10">
                        <div className="mx-auto max-w-3xl px-4">
                            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-warm">
                                {t('bio')}
                            </h2>
                            <div className="border-l-2 border-warm/30 pl-5">
                                <p className="text-base leading-relaxed text-foreground/80">
                                    {artisan.bio}
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── My Groups Section ── */}
                {groups.length > 0 && (
                    <section className="border-b border-border/50 bg-background py-10">
                        <div className="mx-auto max-w-3xl px-4">
                            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-warm">
                                {t('myGroups')}
                            </h2>
                            <div className="space-y-2">
                                {groups.map((g) => (
                                    <div
                                        key={g.membershipId}
                                        className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                                {g.role === 'ADMIN' ? (
                                                    <Shield className="h-4 w-4 text-warm" />
                                                ) : (
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div>
                                                <Link
                                                    href={`/groups/${g.group.slug}`}
                                                    className="text-sm font-medium hover:text-warm"
                                                >
                                                    {g.group.name}
                                                </Link>
                                                <p className="text-xs text-muted-foreground">
                                                    {g.role === 'ADMIN'
                                                        ? t('groupAdmin')
                                                        : t('groupMember')}
                                                </p>
                                            </div>
                                        </div>

                                        {confirmLeave === g.membershipId ? (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleLeaveGroup(g.membershipId, g.group.id)
                                                    }
                                                >
                                                    {t('confirmLeave')}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setConfirmLeave(null)}
                                                >
                                                    {t('cancel')}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setConfirmLeave(g.membershipId)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <LogOut className="mr-1.5 h-4 w-4" />
                                                {t('leaveGroup')}
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* ── Gallery Section ── */}
                <section className="py-10">
                    <div className="mx-auto max-w-3xl px-4">
                        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-warm">
                            {t('gallery')}
                        </h2>
                        <GalleryUpload artisanId={artisan.id} initialImages={galleryImages} />
                    </div>
                </section>
            </div>
        )
    }

    // ── Create / Edit mode ──
    return (
        <div className="container mx-auto max-w-4xl px-4 py-10">
            <div className="space-y-8">
                {/* Header with back button */}
                <div className="flex items-center gap-4 border-b border-border/40 pb-5">
                    {isEditing && (
                        <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold tracking-tight text-primary">
                        {isCreateMode ? t('createTitle') : t('editTitle')}
                    </h1>
                </div>

                {message && (
                    <div
                        className={`rounded-lg p-3 text-sm ${
                            message.type === 'success'
                                ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                                : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                        }`}
                    >
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Photos section */}
                    <div className="rounded-lg border border-border bg-card p-6">
                        <h2 className="mb-4 text-lg font-semibold">{t('coverPhoto')}</h2>
                        <div className="space-y-5">
                            <CoverPhotoUpload
                                artisanId={artisan?.id ?? null}
                                currentCoverUrl={coverUrl}
                                onCoverUploaded={setUploadedCoverId}
                            />
                            <ProfilePhotoUpload
                                artisanId={artisan?.id ?? null}
                                currentPhotoUrl={photoUrl}
                                onPhotoUploaded={setUploadedPhotoId}
                            />
                        </div>
                    </div>

                    {/* Personal info section */}
                    <div className="rounded-lg border border-border bg-card p-6">
                        <h2 className="mb-4 text-lg font-semibold">{t('personalInfo')}</h2>
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label
                                        htmlFor="firstName"
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        {t('firstName')}
                                    </Label>
                                    <Input
                                        id="firstName"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        pattern=".*\D.*"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label
                                        htmlFor="lastName"
                                        className="mb-1.5 block text-sm font-medium"
                                    >
                                        {t('lastName')}
                                    </Label>
                                    <Input
                                        id="lastName"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        pattern=".*\D.*"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="bio" className="mb-1.5 block text-sm font-medium">
                                    {t('bio')}
                                </Label>
                                <Textarea
                                    id="bio"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder={t('bioPlaceholder')}
                                    rows={4}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Craft experience section */}
                    <div className="rounded-lg border border-border bg-card p-6">
                        <h2 className="mb-4 text-lg font-semibold">{t('craftExperience')}</h2>
                        <div className="space-y-5">
                            <div>
                                <Label
                                    htmlFor="yearsOfExperience"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    {t('yearsOfExperience')}
                                </Label>
                                <Input
                                    id="yearsOfExperience"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={yearsOfExperience}
                                    onChange={(e) => setYearsOfExperience(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label
                                    htmlFor="learningSource"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    {t('learningSource')}
                                </Label>
                                <Input
                                    id="learningSource"
                                    value={learningSource}
                                    onChange={(e) => setLearningSource(e.target.value)}
                                    placeholder={t('learningSourcePlaceholder')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location section */}
                    <div className="rounded-lg border border-border bg-card p-6">
                        <h2 className="mb-4 text-lg font-semibold">{t('location')}</h2>
                        <LocationSelect
                            initialCountry={artisan?.country ?? undefined}
                            initialRegion={artisan?.region ?? undefined}
                            onLocationChange={(c, r) => {
                                setCountry(c)
                                setRegion(r)
                            }}
                        />
                    </div>

                    {/* Social & Hashtags section */}
                    <div className="rounded-lg border border-border bg-card p-6">
                        <h2 className="mb-4 text-lg font-semibold">{t('socialAndHashtags')}</h2>
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {[
                                    {
                                        id: 'socialInstagram',
                                        label: t('socialInstagram'),
                                        icon: FaInstagram,
                                        value: socialInstagram,
                                        setter: setSocialInstagram,
                                        placeholder: 'yourhandle',
                                    },
                                    {
                                        id: 'socialFacebook',
                                        label: t('socialFacebook'),
                                        icon: FaFacebook,
                                        value: socialFacebook,
                                        setter: setSocialFacebook,
                                        placeholder: 'yourhandle',
                                    },
                                    {
                                        id: 'socialTwitter',
                                        label: t('socialTwitter'),
                                        icon: FaXTwitter,
                                        value: socialTwitter,
                                        setter: setSocialTwitter,
                                        placeholder: 'yourhandle',
                                    },
                                    {
                                        id: 'socialTiktok',
                                        label: t('socialTiktok'),
                                        icon: FaTiktok,
                                        value: socialTiktok,
                                        setter: setSocialTiktok,
                                        placeholder: 'yourhandle',
                                    },
                                    {
                                        id: 'socialYoutube',
                                        label: t('socialYoutube'),
                                        icon: FaYoutube,
                                        value: socialYoutube,
                                        setter: setSocialYoutube,
                                        placeholder: 'yourchannel',
                                    },
                                    {
                                        id: 'website',
                                        label: t('socialWebsite'),
                                        icon: Globe,
                                        value: website,
                                        setter: setWebsite,
                                        placeholder: 'https://yoursite.com',
                                    },
                                ].map(({ id, label, icon: Icon, value, setter, placeholder }) => (
                                    <div key={id}>
                                        <Label
                                            htmlFor={id}
                                            className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"
                                        >
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                            {label}
                                        </Label>
                                        <Input
                                            id={id}
                                            value={value}
                                            onChange={(e) => setter(e.target.value)}
                                            placeholder={placeholder}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div>
                                <Label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                    {t('hashtags')}
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={hashtagInput}
                                        onChange={(e) => setHashtagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                addHashtag()
                                            }
                                        }}
                                        placeholder={t('addHashtag')}
                                        className="flex-1"
                                    />
                                    <Button type="button" variant="outline" onClick={addHashtag}>
                                        +
                                    </Button>
                                </div>
                                {hashtags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {hashtags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                                            >
                                                #{tag}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setHashtags((prev) =>
                                                            prev.filter((t) => t !== tag),
                                                        )
                                                    }
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Gallery section (edit mode only) */}
                    {!isCreateMode && (
                        <div className="rounded-lg border border-border bg-card p-6">
                            <h2 className="mb-4 text-lg font-semibold">{t('gallery')}</h2>
                            <GalleryUpload
                                artisanId={artisan?.id ?? null}
                                initialImages={galleryImages}
                            />
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3">
                        {isEditing && (
                            <Button type="button" variant="outline" onClick={handleCancelEdit}>
                                {t('cancelEdit')}
                            </Button>
                        )}
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                            {isSubmitting
                                ? isCreateMode
                                    ? t('saving')
                                    : t('updating')
                                : isCreateMode
                                  ? t('save')
                                  : t('update')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
