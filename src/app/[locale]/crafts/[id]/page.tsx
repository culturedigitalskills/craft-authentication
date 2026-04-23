import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useTranslations } from 'next-intl'
import { useParams } from 'next/dist/client/components/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, QrCode, Eye, EyeOff, MapPin } from 'lucide-react';
import { formatDateTime } from '@/components/shared/formatDateTime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCode } from '@/components/shared/qrcode';
import { cookies } from 'next/headers'
import Gallery from '@/components/craft/Gallery'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

const formatDate = (timestamp: string) => 
  new Date(timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
const getCity = async (lat: number, lng: number): Promise<string> => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
  )
  const data = await res.json()
  
  const city = data.address?.city 
    ?? data.address?.town 
    ?? data.address?.village 
    ?? data.address?.county
    ?? 'Unknown location'

  return city
}

export default async function OneCraftPage({ params, searchParams }: PageProps) {
    const session = await auth()
    const { id } = await params
    const { from } = await searchParams
    const backHref = from === 'mycrafts' ? '/crafts/mycrafts' : '/crafts'
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.toString()    

    // retrieve craft data from API using id
    // const p = await params;  
    // const { craftid } = p;
    // console.log('Craft ID from URL:', id);
    // Construct the full URL for the QR code
    // console.log("process.env.NEXT_PUBLIC_BASE_URL:", process.env.NEXT_PUBLIC_BASE_URL);
    const currentPageUrl = `${process.env.AUTH_URL}/crafts/${id}`;
    try {
            // 1. fetch craft first

            const urldata =  `${process.env.AUTH_URL}/api/data/${id}`            
            const method = 'GET'
            console.log('url: ', urldata) // Debug log to check data being submitted
            console.log('method: ', method) // Debug log to check data being submitted

            const res = await fetch(urldata, {
                method,
                credentials: 'include',  // sends cookies automatically
                headers: { 
                          'Content-Type': 'application/json',
                          'Cookie': cookieHeader  // forward cookies to the API
                      },
                        // headers: { 'Content-Type': 'application/json' },
            })
            // console.log('I did it',res)
            if (!res.ok) 
                throw new Error('Request failed')            


            
            const data = await res.json()
            console.log('Data received from API:', data) // Debug log to check response data
            // Look up artisan name from email
            const artisanEmail = data?.data['artisan'] as string | undefined
            let artisanName: string | null = null
            if (artisanEmail) {
                const artisan = await prisma.artisan.findFirst({
                    where: { user: { email: artisanEmail } },
                    select: { firstName: true, lastName: true },
                })
                if (artisan) artisanName = `${artisan.firstName} ${artisan.lastName}`
            }

            // 2. extract media ids
            const mediaIds: string[] = (data?.data['mediaIds'] as string[] ?? []).filter(Boolean)

            
            let images = null

            // 3. fetch images using the ids
            if (mediaIds && mediaIds.length>0){
                       

              images = await Promise.all(mediaIds.map(async (mediaId) => {
              const urlmedia =  `${process.env.AUTH_URL}/api/media/${mediaId}`          
              
              const imagesRes = await fetch(urlmedia, {
                  method,
                  credentials: 'include',
                  headers: { 
                      'Content-Type': 'application/json',
                      'Cookie': cookieHeader
                  },
              })
              // console.log('Image response:', imagesRes) // Debug log to check response status
              if (!imagesRes.ok) 
                  throw new Error('Image request failed')
              return imagesRes
            }))       
          }
              
            // console.log('Images:', images)
            return <RenderOneCraftPage craft={data}
            images={images}
            currentPageUrl={currentPageUrl}
            user={session?.user.email ?? null}
            backHref={backHref}
            artisanName={artisanName}
             />
            
            // console.log('Response status:', res) // Debug log to check response status
        } catch (error) {
          console.log('Error:', error)
          console.log('Error message:', (error as Error).message)
          console.log('Error name:', (error as Error).name)
        } 
                        

}

function RenderOneCraftPage({craft, images, currentPageUrl, user, backHref, artisanName}:
  {craft: any, images: any, currentPageUrl: string, user: any, backHref: string, artisanName: string | null}) {

    // console.log('Craft in OneCraftsPage:', craft);
    const t = useTranslations();
    const craftEditUrl = `create?id=${craft.id}`;
    // console.log("craft?.isPublic",craft?.data['isPublic'])
    const galleryImages = images?.map((image: any) => ({
      url: image.url,   // adjust these fields to match your API response structure
      alt: image.name ?? craft?.data['name'],
    })) ?? []    
  

      return (
    <Container>
    {/* Top bar: back link + edit button */}
    <div className="mb-6 flex items-center justify-between">
      <Link
          href={backHref}
          className="inline-flex rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
          <ArrowLeft className="h-5 w-5" />
      </Link>
      {user === craft?.data['artisan'] && (
        <Button asChild>
          <Link href={craftEditUrl}>{t('createCraft.editCraftTitle')}</Link>
        </Button>
      )}
    </div>

    {/* Main content */}
    <div className="grid gap-8 lg:grid-cols-2">

    {/* Image section */}
    <div className="space-y-4">
        <div>
            <div className="mb-2 gap-2">
              <h1 className="text-5xl font-bold tracking-tight">
              {craft?.name}
              </h1>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium
              ${craft?.data['isPublic']
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
              }`}>
              {craft?.data['isPublic']
                ? <><Eye className="h-3 w-3" /> {t('crafts.details.visible')}</>
                : <><EyeOff className="h-3 w-3" /> {t('crafts.details.notvisible')}</>
              }
            </span>
            </div>
          <div>
            <Gallery images={galleryImages} />
          </div>
            <div className="mt-2 text-lg">
              <p className="font-bold">{t('crafts.details.description')}:</p>
              {craft?.description}
            </div>
            <div className="mt-2 text-lg">
                <p className="font-bold">{t('crafts.details.materials')}:</p>
                {craft?.data['material']}
            </div>
        </div>
    </div>

    {/* Details section */}
    <div className="space-y-6">
          <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('crafts.details.createdBy')}:</span>
                <span className="text-sm font-bold rounded-lg border border-border bg-muted px-2 py-1">
                  {artisanName ?? craft?.data['artisan']}
                </span>
              </div>

            {craft?.data['place'] && (
            <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('crafts.details.createdWhere')}:</span>
                <span className="text-sm text-muted-foreground">
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(craft?.data['place'])}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {craft?.data['place']}
                </a>
              </span>
            </div>
            )}

            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('crafts.details.createdOn')}:</span>
              <span className="text-sm text-muted-foreground">{formatDate(craft?.data['createdOn'])}</span>
            </div>

            <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('crafts.details.updatedOn')}:</span>
                <span className="text-sm text-muted-foreground">{formatDate(craft?.data['updatedOn'])}</span>
            </div>
          </div>

        {/* QR Code card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="h-4 w-4" />
                {t('crafts.details.qrCodeTitle')}
              </CardTitle>
              <CardDescription>{t('crafts.details.qrCodeDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-16">
              <div className="h-48 w-48 rounded-lg border bg-white p-4">
                                {/* Allow for colors to be sent to QR code. */}
                {/* <QRCodeSVG value={currentPageUrl} fgColor={'oklch(0.7 0.1406 223.41)'} bgColor={'oklch(1.00 0.000 70)'} margin={2} className="h-full w-full" /> */}
                {/* <QRCode data={currentPageUrl}/>   */}
                 <QRCode data={currentPageUrl} foreground={'oklch(0.2 0.1406 223.41)'} background={'oklch(1.00 0.000 70)'} margin={2} className="h-full w-full" />
              </div>
              <div className="max-w-full break-all text-center text-xs text-muted-foreground">
                {currentPageUrl}
              </div>
            </CardContent>
          </Card>
          {/* Verifiable Credential card */}
          {/* {craft.verifiableCredential && (
            <VerifiableCredentialCard
              craftId={craft.id}
              verifiableCredential={craft.verifiableCredential as Record<string, unknown>}
            /> 
          )}*/}
    </div>
    </div>
    </Container>
    
    )
  }
