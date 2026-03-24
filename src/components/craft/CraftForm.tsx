'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ExternalLink, Pencil, User } from 'lucide-react'
import { ProfilePhotoUpload } from '../profile/ProfilePhotoUpload'
import { useRouter } from 'next/navigation'
import { time } from 'console'
import { email, file } from 'zod'
import { Prisma } from '@prisma/client'


interface Craft {
    id: string
    name: string  
    description: string | null   
    data: Prisma.JsonValue | null
}

interface CraftFormProps {
    craft: Craft | null,
    user: string | null 
}

async function submitImages(images: File[]): Promise<string[]> {
    if (images.length === 0) return []
    
    //Now upload the images if there are any
    const ids = await Promise.all(images.map(async (image) => {
        const formData = new FormData()
        formData.append('file', image)
        console.log(image.name)

        const url = '/api/media/upload' 
        console.log('url: ', url) // Debug log to check data being submitted
        const method = 'POST'
        console.log('method: ', method) // Debug log to check data being submitted
        console.log('image: ', image) // Debug log to check data being submitted
        console.log('formData: ', [...formData.entries()]) // Debug log to check data being submitted

        const mediares = await fetch(url, {
            method: method,
            body: formData,
        })
        const newmedia = await mediares.json()
        console.log("response ",newmedia)
        console.log('*****Uploaded media:', newmedia?.id) // Debug log to check created craft data
        return newmedia?.id  // return the id from each upload
        
    }))
    console.log('All image ids:', ids)
    return ids  // e.g. ['abc123', 'def456']    

}    

export function CraftForm({ craft, user }: CraftFormProps) {
    const t = useTranslations('')
    const router = useRouter()

    const [isEditing, setIsEditing] = useState(!!craft)
    const [isCreateMode, setIsCreateMode] = useState(!craft)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
    
    // const [id, setId] = useState(craft?.id ?? '')
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
                            console.log(position.coords.latitude)

            setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            })
            },
            (error) => {
            console.error('Error getting location:', error.message)
            }
        )
    }, [])    

    // const [material, setMaterial] = useState<string>(data?.['material'] as string ?? '')
    // const [material, setMaterial] = useState<string>('')
    // useEffect(() => {
    //     setMaterial(data?.['material'] as string ?? '')
    // }, [data])
    // const [isPublic, setIsPublic] = useState<boolean>(data?.['isPublic'] as boolean ?? false)
    // const [artisan, setArtisan] = useState<string>(data?.['artisan'] as string ?? '')
    // const [createdOn, setCreatedOn] = useState<string>(data?.['createdOn'] as string ?? '')
    // const [updatedOn, setUpdatedOn] = useState<string>(data?.['updatedOn'] as string ?? '')
    // const [material, setMaterial] = useState(craft?.material ?? '')
    // const [isPublic, setIsPublic] = useState(craft?.isPublic ?? false)
    // const [artisan, setArtisan] = useState(craft?.artisan ?? '')
    const [images, setImages] = useState<File[]>([])
      
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        //gettimestamp for createOn field
        const getTimestamp = () => new Date().toISOString()
        const timestamp = getTimestamp()
        // const location = getLocation()
        if (isCreateMode) {
            setCreatedOn(timestamp)
        }
        console.log("data?.material: ",data?.material)
        console.log("material: ",material)
        console.log(location?.lat)
        console.log(location?.lng)
        
        //get the city
        let city = null
        if (isSharedLocation && location?.lat && location?.lng) {
                const geoRes = await fetch(`/api/geocode?lat=${location?.lat}&lng=${location?.lng}`)
            const geoData = await geoRes.json()
            city = geoData.city  
        }
                    
        // deal with the images
        const ids = await submitImages(images)        
        console.log("did it wait: ",ids)
        console.log("data?.mediaIds: ", data?.mediaIds)
        
        const craftdata = {
            // id: isCreateMode ? generateId() : craft?.id,
            name:  name,
            description:  description,
            data: {
                    ...data,   
                    'material': material,
                    'isPublic': isPublic,
                    'isSharedLocation': isSharedLocation,
                    'artisan': data?.artisan ?? user ?? '',
                    'createdOn': data?.createdOn ?? timestamp,
                    'updatedOn': timestamp,
                    // keep existing if present, otherwise use new ids
                    'mediaIds': data?.mediaIds ?? ids,       
                    // 'mediaIds': data?.mediaIds ?? ids,
                    // merge existing and new ids together
                    // 'mediaIds': [...(Array.isArray(data?.mediaIds) ? data.mediaIds : []), ...ids],                    
                    //If data already has a location → keep it If not but we have a new GPS location → use that If neither → null
                    'location': data?.location ? data.location : location ? { lat: location.lat, lng: location.lng } : null,
                    'place': data?.city ?? city
                    // 'material': data?.material ?? material,
                    // 'isPublic': data?.isPublic ?? isPublic,
                    // 'artisan': data?.artisan ?? user ?? '',
                    // 'createdOn': data?.createdOn ?? timestamp,
                    // // createdOn: isCreateMode ? timestamp : createdOn,
                    // 'updatedOn': timestamp,
                    // 'mediaIds': data?.mediaIds ?? ids,
                }       
            }
        
        console.log('Submitting data:', craftdata) // Debug log to check data being submitted
        try {
            const url = isCreateMode ? '/api/data' : `/api/data/${craft?.id}`
            const method = isCreateMode ? 'POST' : 'PUT'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(craftdata),
            })
            
            if (!res.ok) 
                throw new Error('Request failed')

            setMessage({
                text: isCreateMode ? t('createCraft.craftCreateSuccess') : t('createCraft.craftUpdateSuccess'),
                type: 'success',
            })

            // 1. check the image file itself first
            console.log('images array:', images)
            console.log('image file:', images[0])

            // 2. then append and check
            const formData = new FormData()
            formData.append('file', images[0])


            console.log('formData entries:', [...formData.entries()])
            console.log('images:', images.length )

    
            // if (isCreateMode||isEditing) {
            const newCraft = await res.json()
            router.push(`/crafts/${newCraft.id}`)
            // router.refresh()


       
            // }

        } catch {
            setMessage({
                text: isCreateMode ? t('createCraft.createFailed') : t('createCraft.updateFailed'),
                type: 'error',
            })
        } finally {
            setIsSubmitting(false)
            // window.location.reload()

            

        }
    }

    function handleCancelEdit() {
        router.push(`/crafts/${craft?.id}`) 
    }
    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this?')) return

        const mediaidstodelete = data?.['mediaIds'] as string[]
        if (mediaidstodelete && mediaidstodelete.length > 0) {
        await Promise.all(mediaidstodelete.map(async (mediaId: string) => {
            if (!mediaId) return  // skip null values
            const res = await fetch(`/api/media/${mediaId}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                console.error(`Failed to delete media ${mediaId}`)
            } else {
                console.log(`Deleted media ${mediaId}`)
            }
         }))
        }        

        //delete the item
        const url = `/api/data/${craft?.id}`
        const res = await fetch(url, {
            method: 'DELETE',
        })

        if (res.ok) {
            router.push('/crafts')  // redirect back to list after delete
        }        


        
    }

    return (
        <Card className="mx-auto max-w-2xl overflow-hidden rounded-2xl shadow-lg">
            <div className="bg-gradient-to-br from-card via-muted/50 to-card px-6 py-6">
                <h1 className="text-left text-2xl font-bold tracking-tight">
                    {isCreateMode ? 
                    t('createCraft.createCraftTitle') : 
                    t('createCraft.editCraftTitle')}
                </h1>
                <p className="text-left text-sm text-muted-foreground">
                    {isCreateMode ? 
                    t('createCraft.createCraftHelper') : 
                    t('createCraft.createEdittHelper')}
                </p>
            </div>        
            <CardContent className="p-6">
                {message && (
                    <div
                        className={`mb-6 rounded-lg p-3 text-sm ${
                            message.type === 'success'
                                ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                                : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                        }`}
                    >
                        {message.text}
                    </div>
                )}  

                <form onSubmit={handleSubmit} className="space-y-8">

                <div className="space-y-2">
                    <Label htmlFor="name" className="text-left font-medium">
                        {t('createCraft.createCraftName')}
                    </Label>
                    <Input
                        id="name"
                        className="bg-blue-50 border-blue-200 focus:border-blue-400"                       
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                          required
                    />                    
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description" className="text-left font-medium">
                        {t('createCraft.createCraftDescription')}
                    </Label>
                    <Textarea
                        id="description"
                        className="bg-blue-50 border-blue-200 focus:border-blue-400"                       
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}                                    
                        required
                    />                    
                </div>    
                <div className="space-y-2">
                    <Label htmlFor="material" className="text-left font-medium">
                        {t('createCraft.createCraftMaterial')}
                    </Label>
                    <select
                    id="material"
                    value={material}
                    onChange={(e) => {
                    setMaterial(e.target.value)
                    }}
                    className="w-full rounded-md border border-gray-300 bg-blue-50 px-3 py-2 focus:border-blue-400 focus:outline-none"
                    >
                    <option value="">Select one</option>
                    <option value="Cotton">{t('materials.cotton')}</option>
                    <option value="Wool">{t('materials.wool')}</option>
                    <option value="Mix">{t('materials.mix')}</option>
                    </select>
                </div>  
            <div className="space-y-2">

            {/* is craft public */}
            <div className="space-y-2">
            <label htmlFor="isPublic">
                <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                />
                &nbsp;&nbsp;{t('createCraft.createCraftPublic')}
            </label>
            </div>
            
            {/* is craft public */}
            <div className="space-y-2">
            <label htmlFor="isSharedLocation">
                <input
                type="checkbox"
                id="isSharedLocation"
                checked={isSharedLocation}
                onChange={(e) => setIsSharedLocation(e.target.checked)}
                />
                &nbsp;&nbsp;{t('createCraft.createCraftMakeLocationPublic')}
            </label>
            </div>            

            {/* upload images */}

            <div className="space-y-2">
            <Label htmlFor="material" className="text-left font-medium">
                {t('createCraft.uploadImages')}
            </Label>           
            <br/>     
            <input
                type="file"
                id="images"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => 
                    setImages(Array.from(e.target.files || []))
                }
            />
            <Button className="border-gray-300 hover:bg-muted-foreground text-white"
             type="button" 
             onClick={() => document.getElementById('images')?.click()}>
               {t('createCraft.browse')}
            </Button>
            {images.length > 0 && <p>{images.length} {t('createCraft.imagesSelected')}</p>}
            </div>

            </div >                                              
                <div className="right-0 flex items-center justify-end gap-2">
                        <Button className="border-gray-300 hover:bg-muted-foreground text-white"
                        type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? isCreateMode                                
                                    ? t('createCraft.savingCraft')
                                    : t('createCraft.updatingCraft')
                                : isCreateMode
                                  ? t('createCraft.saveCraft')
                                  : t('createCraft.updateCraft')}
                            </Button>
                            {isEditing ? (
                                <Button className="border-gray-300 hover:bg-muted-foreground text-white"
                                onClick={handleCancelEdit}
                                >
                                   
                                    {t('createCraft.cancelEdit')}
                                </Button>
                                ) : null}
                            {isEditing ? (
                                <Button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                                onClick={handleDelete}>
                                    {t('createCraft.deleteCraft')}
                                </Button>
                                ) : null}

                    </div>

                </form>
            </CardContent>                    
        </Card>
        
    )
}
