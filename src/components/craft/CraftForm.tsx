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
    // material: string | null
    // isPublic: boolean
    // artisan: string | null
    // createdOn: Date     
    // updatedOn: Date
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
        // console.log(image.name)

        const url = '/api/media/upload' 
        // console.log('url: ', url) // Debug log to check data being submitted
        const method = 'POST'
        // console.log('method: ', method) // Debug log to check data being submitted
        // console.log('image: ', image) // Debug log to check data being submitted
        // console.log('formData: ', [...formData.entries()]) // Debug log to check data being submitted

        const mediares = await fetch(url, {
            method: method,
            body: formData,
        })
        const newmedia = await mediares.json()
        // console.log('*****Uploaded media:', newmedia?.file?.id) // Debug log to check created craft data
        return newmedia?.file?.id  // return the id from each upload
        
    }))
    // console.log('All image ids:', ids)
    return ids  // e.g. ['abc123', 'def456']    

}    

export function CraftForm({ craft, user }: CraftFormProps) {
    const t = useTranslations('')
    const router = useRouter()

    const [isEditing, setIsEditing] = useState(false)
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
    const [isPublic, setIsPublic] = useState(data?.['isPublic'] as boolean ?? 0)
    const [createdOn, setCreatedOn] = useState(data?.['createdOn'] as string ?? '')
    const [updatedOn, setUpdatedOn] = useState(data?.['updatedOn'] as string ?? '')
    const [mediaIds, setmediaIds] = useState(data?.['mediaIds'] as [] ?? '')

    useEffect(() => {
        setMaterial(data?.['material'] as string ?? '')
        setArtisan(data?.['artisan'] as string ?? '')
        setIsPublic(data?.['isPublic'] as boolean ?? 0)
        setCreatedOn(data?.['CreatedOn'] as string ?? '')
        setUpdatedOn(data?.['updatedOn'] as string ?? '')
        setmediaIds(data?.['mediaIds'] as [] ?? '')
    }, [data])  


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
    // useEffect(() => {
    //     if (record?.['material']) {
    //         setMaterial(record['material'] as string)
    //     }
    // }, [data]) // re-runs when data changes

    const isCreateMode = !craft
    // console.log("****isediting: ", isEditing, "  isCreateMode: ", isCreateMode, "isSubmitting: ", isSubmitting) // Debug log to check mode
    // console.log('Craft in form:', craft) // Debug log to check craft data
    
    // const showForm = isCreateMode || isEditing
    // console.log('^^^^^^^^^^^^^Submitting description:', description) // Debug log to check data being submitted
   
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        //gettimestamp for createOn field
        const getTimestamp = () => new Date().toISOString()
        const timestamp = getTimestamp()

        if (isCreateMode) {
            setCreatedOn(timestamp)
        }

        const ids = await submitImages(images)        
        const craftdata = {
            // id: isCreateMode ? generateId() : craft?.id,
            name:  name,
            description:  description,
            data: {
                    ...data,          // spread existing data
                    'material': data?.material ?? material,
                    'isPublic': data?.isPublic ?? isPublic,
                    'artisan': data?.artisan ?? user ?? '',
                    'createdOn': data?.createdOn ?? timestamp,
                    // createdOn: isCreateMode ? timestamp : createdOn,
                    'updatedOn': timestamp,
                    'mediaIds': data?.mediaIds ?? ids,

                }       
            }
        
        // console.log('Submitting data:', craftdata) // Debug log to check data being submitted
        try {
            const url = isCreateMode ? '/api/data' : `/api/data/${craft.id}`
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
        // console.log("--->isediting: ", isEditing, "  isCreateMode: ", isCreateMode) // Debug log to check mode
        setIsEditing(false)
        setMessage(null)
    }

    // console.log('showForm:', showForm) // Debug log to check craft prop
    // ── View mode — scroll sections layout ──
    // if (!showForm && craft) {
    //     console.log('show form not, and Craft data:', craft) // Debug log to check craft data
    //     return (
    //         <div className="-mt-16">
    //             {/* ── Hero Banner ── */}
    //             <section className="relative overflow-hidden border-b border-border/50 bg-muted/60 pb-14 pt-24">
    //                 <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl" />
    //                 <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/[0.07] blur-3xl" />

    //                 <div className="relative mx-auto max-w-4xl px-4 text-center">
    //                     {/* Avatar */}
    //                     <div className="mx-auto mb-4 h-28 w-28 overflow-hidden rounded-full border-4 border-background shadow-xl sm:h-32 sm:w-32">
    //                         {/* {photoUrl ? (
    //                             <Image
    //                                 src={photoUrl}
    //                                 alt={`${artisan.firstName} ${artisan.lastName}`}
    //                                 width={128}
    //                                 height={128}
    //                                 className="h-full w-full object-cover"
    //                             />
    //                         ) : (
    //                             <div className="flex h-full w-full items-center justify-center bg-muted">
    //                                 <User className="h-10 w-10 text-muted-foreground" />
    //                             </div>
    //                         )} */}
    //                     </div>

    //                     <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
    //                         {/* {artisan.firstName} {artisan.lastName} */}
    //                     </h1>

    //                     {/* {locationText && (
    //                         <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
    //                             <MapPin className="h-4 w-4" />
    //                             {locationText}
    //                         </p>
    //                     )} */}

    //                     <div className="mt-4 flex flex-wrap justify-center gap-3">
    //                         <Button onClick={() => setIsEditing(true)}>
    //                             <Pencil className="mr-2 h-4 w-4" />
    //                             {t('edit')}
    //                         </Button>
    //                         {/* <Button variant="outline" asChild>
    //                             <Link href={`/artisans/2`}>
    //                                 <ExternalLink className="mr-2 h-4 w-4" />
    //                                 {t('publicProfileLink')}
    //                             </Link>
    //                         </Button> */}
    //                     </div>
    //                 </div>
    //             </section>

    //             {message && (
    //                 <div className="mx-auto max-w-4xl px-4">
    //                     <div
    //                         className={`mt-6 rounded-lg p-3 text-sm ${
    //                             message.type === 'success'
    //                                 ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
    //                                 : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
    //                         }`}
    //                     >
    //                         {message.text}
    //                     </div>
    //                 </div>
    //             )}

    //             {/* ── Stats Section ── */}
    //             <section className="border-b border-border/50 bg-background py-8">
    //                 <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 px-4 sm:grid-cols-3">
    //                     {/* {artisan.yearsOfExperience !== null && (
    //                         <div className="rounded-lg bg-muted/60 p-5 text-center">
    //                             <Clock className="mx-auto mb-2 h-6 w-6 text-primary" />
    //                             <p className="font-semibold">{artisan.yearsOfExperience} {t('yearsLabel')}</p>
    //                             <p className="text-xs text-muted-foreground">{t('craftExperience')}</p>
    //                         </div>
    //                     )} */}
    //                     {/* {artisan.learningSource && (
    //                         <div className="rounded-lg bg-muted/60 p-5 text-center">
    //                             <GraduationCap className="mx-auto mb-2 h-6 w-6 text-primary" />
    //                             <p className="font-semibold">{artisan.learningSource}</p>
    //                             <p className="text-xs text-muted-foreground">{t('learningSource')}</p>
    //                         </div>
    //                     )}
    //                     {locationText && (
    //                         <div className="rounded-lg bg-muted/60 p-5 text-center">
    //                             <MapPin className="mx-auto mb-2 h-6 w-6 text-primary" />
    //                             <p className="font-semibold">{locationText}</p>
    //                             <p className="text-xs text-muted-foreground">{t('location')}</p>
    //                         </div>
    //                     )} */}
    //                 </div>
    //             </section>

    //             {/* ── About Section ── */}
    //             {material && (
    //                 <section className="bg-muted/40 py-10">
    //                     <div className="mx-auto max-w-3xl px-4">
    //                         <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
    //                             {t('bio')}
    //                         </h2>
    //                         <div className="border-l-2 border-primary/30 pl-5">
    //                             <p className="text-base leading-relaxed text-foreground/80">
    //                                 {material}
    //                             </p>
    //                         </div>
    //                     </div>
    //                 </section>
    //             )}

    //             {/* ── Gallery placeholder section (future) ── */}
    //             {/* Will be implemented with masonry grid when gallery feature is added */}
    //         </div>
    //     )
    // }

    // ── Create / Edit mode ──
    // console.log("&&&&isediting: ", isEditing, "  isCreateMode: ", isCreateMode, "isSubmitting: ", isSubmitting) // Debug log to check mode

    // if(craft) setIsEditing(true)

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
                <div className="right-0 flex items-center justify-end gap-4">
                        <Button type="submit" size="lg" disabled={isSubmitting}>
                            {isSubmitting
                                ? isCreateMode                                
                                    ? t('createCraft.savingCraft')
                                    : t('createCraft.updatingCraft')
                                : isCreateMode
                                  ? t('createCraft.saveCraft')
                                  : t('createCraft.updateCraft')}
                            </Button>
                            {/* {isEditing && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    onClick={handleCancelEdit}
                                >
                                    {t('createCraft.cancelEdit')}
                                </Button>
                            )} */}
                    </div>

                </form>
            </CardContent>                    
        </Card>
        
    )
}
