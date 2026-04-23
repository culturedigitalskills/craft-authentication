'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Prisma } from '@prisma/client'

interface Craft {
    id: string
    name: string
    description: string | null
    data: Prisma.JsonValue | null
}

interface CraftFormProps {
    craft: Craft | null
    user: string | null
}

async function submitImages(images: File[]): Promise<string[]> {
    if (images.length === 0) return []
    return Promise.all(
        images.map(async (image) => {
            const formData = new FormData()
            formData.append('file', image)
            const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
            const media = await res.json()
            return media?.id
        })
    )
}

export function CraftForm({ craft, user }: CraftFormProps) {
    const t = useTranslations('')
    const router = useRouter()

    const isCreateMode = !craft

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const [name, setName] = useState(craft?.name ?? '')
    const [description, setDescription] = useState(craft?.description ?? '')

    const [data, setData] = useState<Record<string, unknown> | null>(
        (craft?.data as Record<string, unknown>) ?? null
    )
    const [material, setMaterial] = useState<string>(data?.['material'] as string ?? '')
    const [artisan, setArtisan] = useState<string>(data?.['artisan'] as string ?? '')
    const [isPublic, setIsPublic] = useState<boolean>(data?.['isPublic'] as boolean ?? false)
    const [isSharedLocation, setIsSharedLocation] = useState<boolean>(
        data?.['isSharedLocation'] === undefined ? true : Boolean(data?.['isSharedLocation'])
    )
    const [createdOn, setCreatedOn] = useState(data?.['createdOn'] as string ?? '')
    const [updatedOn, setUpdatedOn] = useState(data?.['updatedOn'] as string ?? '')
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [mediaIds, setmediaIds] = useState(data?.['mediaIds'] as [] ?? '')
    const [images, setImages] = useState<File[]>([])

    useEffect(() => {
        setMaterial(data?.['material'] as string ?? '')
        setArtisan(data?.['artisan'] as string ?? '')
        setIsPublic(data?.['isPublic'] as boolean ?? false)
        setIsSharedLocation(data?.['isSharedLocation'] as boolean ?? true)
        setCreatedOn(data?.['CreatedOn'] as string ?? '')
        setUpdatedOn(data?.['updatedOn'] as string ?? '')
        setmediaIds(data?.['mediaIds'] as [] ?? '')
    }, [data])

    useEffect(() => {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                })
            },
            (error) => {
                console.error('Geolocation error:', error.message)
            }
        )
    }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        const timestamp = new Date().toISOString()
        if (isCreateMode) setCreatedOn(timestamp)

        let city = null
        if (isSharedLocation && location?.lat && location?.lng) {
            const geoRes = await fetch(`/api/geocode?lat=${location.lat}&lng=${location.lng}`)
            const geoData = await geoRes.json()
            city = geoData.city
        }

        const ids = await submitImages(images)

        const craftdata = {
            name,
            description,
            data: {
                ...data,
                material,
                isPublic,
                isSharedLocation,
                artisan: data?.artisan ?? user ?? '',
                createdOn: data?.createdOn ?? timestamp,
                updatedOn: timestamp,
                mediaIds: data?.mediaIds ?? ids,
                location: data?.location ? data.location : location ? { lat: location.lat, lng: location.lng } : null,
                place: data?.city ?? city,
            },
        }

        try {
            const url = isCreateMode ? '/api/data' : `/api/data/${craft?.id}`
            const method = isCreateMode ? 'POST' : 'PUT'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(craftdata),
            })

            if (!res.ok) throw new Error('Request failed')

            setMessage({
                text: isCreateMode ? t('createCraft.craftCreateSuccess') : t('createCraft.craftUpdateSuccess'),
                type: 'success',
            })

            const newCraft = await res.json()
            router.push(`/crafts/${newCraft.id}`)
        } catch {
            setMessage({
                text: isCreateMode ? t('createCraft.createFailed') : t('createCraft.updateFailed'),
                type: 'error',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    function handleCancelEdit() {
        router.push(`/crafts/${craft?.id}`)
    }

    async function handleDelete() {
        if (!confirm(t('createCraft.deleteCraftConfirm'))) return

        const mediaidstodelete = data?.['mediaIds'] as string[]
        if (mediaidstodelete?.length > 0) {
            await Promise.all(
                mediaidstodelete.map(async (mediaId: string) => {
                    if (!mediaId) return
                    await fetch(`/api/media/${mediaId}`, { method: 'DELETE' })
                })
            )
        }

        const res = await fetch(`/api/data/${craft?.id}`, { method: 'DELETE' })
        if (res.ok) router.push('/crafts')
    }

    return (
        <Card className="mx-auto max-w-2xl overflow-hidden rounded-2xl shadow-lg">
            <div className="bg-primary px-6 py-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/crafts"
                        className="rounded-md p-2 text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-left text-2xl font-bold tracking-tight text-primary-foreground">
                            {isCreateMode
                                ? t('createCraft.createCraftTitle')
                                : t('createCraft.editCraftTitle')}
                        </h1>
                        <p className="text-left text-sm text-primary-foreground/70">
                            {isCreateMode
                                ? t('createCraft.createCraftHelper')
                                : t('createCraft.createEdittHelper')}
                        </p>
                    </div>
                </div>
            </div>

            <CardContent className="p-6">
                {message && (
                    <div
                        className={`mb-6 rounded-lg p-3 text-sm ${
                            message.type === 'success'
                                ? 'bg-green-50 text-green-800'
                                : 'bg-red-50 text-red-800'
                        }`}
                    >
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="name">
                            {t('createCraft.createCraftName')}
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">
                            {t('createCraft.createCraftDescription')}
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('createCraft.createCraftDescriptionPlaceholder')}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="material">
                            {t('createCraft.createCraftMaterial')}
                        </Label>
                        <Select value={material} onValueChange={setMaterial}>
                            <SelectTrigger id="material">
                                <SelectValue placeholder={t('createCraft.selectMaterial')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cotton">{t('materials.cotton')}</SelectItem>
                                <SelectItem value="Wool">{t('materials.wool')}</SelectItem>
                                <SelectItem value="Mix">{t('materials.mix')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="isPublic" className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="rounded border-input"
                            />
                            {t('createCraft.createCraftPublic')}
                        </label>
                        <label htmlFor="isSharedLocation" className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                id="isSharedLocation"
                                checked={isSharedLocation}
                                onChange={(e) => setIsSharedLocation(e.target.checked)}
                                className="rounded border-input"
                            />
                            {t('createCraft.createCraftMakeLocationPublic')}
                        </label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="images">
                            {t('createCraft.uploadImages')}
                        </Label>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => document.getElementById('images')?.click()}
                            >
                                {t('createCraft.browse')}
                            </Button>
                            {images.length > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    {images.length} {t('createCraft.imagesSelected')}
                                </span>
                            )}
                        </div>
                        <input
                            type="file"
                            id="images"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => setImages(Array.from(e.target.files || []))}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? isCreateMode
                                    ? t('createCraft.savingCraft')
                                    : t('createCraft.updatingCraft')
                                : isCreateMode
                                  ? t('createCraft.saveCraft')
                                  : t('createCraft.updateCraft')}
                        </Button>
                        {!isCreateMode && (
                            <Button variant="outline" onClick={handleCancelEdit}>
                                {t('createCraft.cancelEdit')}
                            </Button>
                        )}
                        {!isCreateMode && (
                            <Button variant="destructive" onClick={handleDelete}>
                                {t('createCraft.deleteCraft')}
                            </Button>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
