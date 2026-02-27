'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface Artisan {
    id: string
    firstName: string
    lastName: string
    bio: string | null
    yearsOfExperience: number | null
    learningSource: string | null
}

interface ArtisanProfileFormProps {
    artisan: Artisan | null
}

export function ArtisanProfileForm({ artisan }: ArtisanProfileFormProps) {
    const t = useTranslations('profile')
    const [isEditing, setIsEditing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const [firstName, setFirstName] = useState(artisan?.firstName ?? '')
    const [lastName, setLastName] = useState(artisan?.lastName ?? '')
    const [bio, setBio] = useState(artisan?.bio ?? '')
    const [yearsOfExperience, setYearsOfExperience] = useState(
        artisan?.yearsOfExperience?.toString() ?? ''
    )
    const [learningSource, setLearningSource] = useState(artisan?.learningSource ?? '')

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

        try {
            const url = isCreateMode ? '/api/artisans' : `/api/artisans/${artisan.id}`
            const method = isCreateMode ? 'POST' : 'PUT'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (!res.ok) {
                throw new Error('Request failed')
            }

            setMessage({
                text: isCreateMode ? t('createSuccess') : t('updateSuccess'),
                type: 'success',
            })

            // Reload to show updated data from server
            window.location.reload()
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
        setMessage(null)
    }

    return (
        <Card className="mx-auto max-w-2xl">
            <CardHeader>
                <CardTitle>
                    {isCreateMode
                        ? t('createTitle')
                        : isEditing
                          ? t('editTitle')
                          : t('title')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {message && (
                    <div
                        className={`mb-4 rounded-md p-3 text-sm ${
                            message.type === 'success'
                                ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                                : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                        }`}
                    >
                        {message.text}
                    </div>
                )}

                {showForm ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">{t('firstName')}</Label>
                                <Input
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">{t('lastName')}</Label>
                                <Input
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">{t('bio')}</Label>
                            <Textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder={t('bioPlaceholder')}
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="yearsOfExperience">{t('yearsOfExperience')}</Label>
                            <Input
                                id="yearsOfExperience"
                                type="number"
                                min="0"
                                max="100"
                                value={yearsOfExperience}
                                onChange={(e) => setYearsOfExperience(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="learningSource">{t('learningSource')}</Label>
                            <Input
                                id="learningSource"
                                value={learningSource}
                                onChange={(e) => setLearningSource(e.target.value)}
                                placeholder={t('learningSourcePlaceholder')}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting
                                    ? isCreateMode
                                        ? t('saving')
                                        : t('updating')
                                    : isCreateMode
                                      ? t('save')
                                      : t('update')}
                            </Button>
                            {isEditing && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                >
                                    {t('cancelEdit')}
                                </Button>
                            )}
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('firstName')}
                                </p>
                                <p>{artisan.firstName}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('lastName')}
                                </p>
                                <p>{artisan.lastName}</p>
                            </div>
                        </div>

                        {artisan.bio && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('bio')}
                                </p>
                                <p>{artisan.bio}</p>
                            </div>
                        )}

                        {artisan.yearsOfExperience !== null && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('yearsOfExperience')}
                                </p>
                                <p>
                                    {artisan.yearsOfExperience} {t('yearsLabel')}
                                </p>
                            </div>
                        )}

                        {artisan.learningSource && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('learningSource')}
                                </p>
                                <p>{artisan.learningSource}</p>
                            </div>
                        )}

                        <Button onClick={() => setIsEditing(true)}>{t('edit')}</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
