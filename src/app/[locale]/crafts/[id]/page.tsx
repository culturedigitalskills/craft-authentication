import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useTranslations } from 'next-intl'
import { useParams } from 'next/dist/client/components/navigation';
import Link from 'next/link';
import { Badge, User, Calendar, QrCode } from 'lucide-react';
import { formatDateTime } from '@/components/formatDateTime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCode } from '@/components/qrcode';
import { data } from 'tailwindcss/defaultTheme';
import { cookies } from 'next/headers'
import Gallery from '@/components/craft/Gallery'

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const formatDate = (timestamp: string) => 
  new Date(timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

export default async function OneCraftPage({ params }: PageProps) {
    const { id } = await params;
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
            console.log('I did it',res)
            if (!res.ok) 
                throw new Error('Request failed')            


            
            const data = await res.json()
            console.log('Data received from API:', data) // Debug log to check response data

            // 2. extract media ids
            const mediaIds: string[] = data?.data['mediaIds'] ?? []
            console.log('**********Media IDs:', mediaIds)

            // 3. fetch images using the ids
            const images = await Promise.all(mediaIds.map(async (mediaId) => {
              const urlmedia =  `${process.env.AUTH_URL}/api/media/${mediaId}`          
              
              const imagesRes = await fetch(urlmedia, {
                  method,
                  credentials: 'include',
                  headers: { 
                      'Content-Type': 'application/json',
                      'Cookie': cookieHeader
                  },
              })
              console.log('Image response:', imagesRes) // Debug log to check response status
              if (!imagesRes.ok) 
                  throw new Error('Image request failed')
              return imagesRes
            }))       

            console.log('Images:', images)
            return <RenderOneCraftPage craft={data} images={images} currentPageUrl={currentPageUrl} />
            
            // console.log('Response status:', res) // Debug log to check response status
        } catch (error) {
          console.log('Error:', error)
          console.log('Error message:', (error as Error).message)
          console.log('Error name:', (error as Error).name)
        } 
                        

}

function RenderOneCraftPage({craft, images, currentPageUrl}: {craft: any, images: any, currentPageUrl: string}) {

    console.log('Craft in OneCraftsPage:', craft);
    const t = useTranslations();
    const craftEditUrl = `create?id=${craft.id}`;
    
    const galleryImages = images?.map((image: any) => ({
      url: image.url,   // adjust these fields to match your API response structure
      alt: image.name ?? craft?.data['name'],
    })) ?? []    

      return (
    <Container> 
    {/* Main content */}
    <div className="grid gap-8 lg:grid-cols-2">
    
    {/* Image section */}
    <div className="space-y-4 ">

        <div>
            <div className="mb-2 gap-2">
              <h1 className="text-5xl font-bold tracking-tight">
              {craft?.name}
              </h1>
              {/* <Badge variant="outline" className="text-xs">
                Public
              </Badge> */}
            </div>
          <div>
            <Gallery images={galleryImages} />
            {/* rest of your component */}
          </div>            
            <div className="mt-2 text-lg">
              <p className="font-bold">{t('crafts.details.description')}:</p>
              {craft?.description}
            </div>
            
              <div className="mt-2 text-lg">
                <p className="font-bold">{t('crafts.details.materials')}:</p>
                {craft?.data['material']}
            </div>         
              {/* {crafts.find(c => c.id === parseInt(craftid))?.description || t('crafts.details.noDescription')} */}
        </div>       
    </div>          

    {/* Details section */}
    <div className="space-y-6">
    {/* Metadata */}
          <div className="space-y-4">
            {/* Creator information */}
            {/* {crafts.find(c => c.id === parseInt(craftid))?.owner  && ( */}
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('crafts.details.createdBy')}:</span>
                <span className="text-sm font-bold rounded-lg border border-border bg-muted px-2 py-1">
                  {craft?.data['artisan'] }

                  {/* {crafts.find(c => c.id === parseInt(craftid))?.email || t('crafts.details.noDescription')} */}
                </span>
              </div>
            {/* )} */}

            {/* Created date */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('crafts.details.createdOn')}:</span>
              <span className="text-sm text-muted-foreground">
                
                {formatDate(craft?.data['createdOn']) }
                {/* {formatDateTime(crafts.find(c => c.id === parseInt(craftid))?.createdAt || '')} */}
              </span>
            </div>

            {/* Updated date if different */}
            <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('crafts.details.updatedOn')}:</span>
                <span className="text-sm text-muted-foreground">
                {formatDate(craft?.data['updatedOn']) }

                  {/* {formatDateTime(crafts.find(c => c.id === parseInt(craftid))?.createdAt || '')} */}
                </span>
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

    {/* Give option to delete */}
    <div className="flex flex-wrap gap-3 mt-8">
      <Button variant="outline" asChild>
          <Link href={craftEditUrl}>
              {t('createCraft.editCraftTitle')}
          </Link>
      </Button>
    </div>

    {/* Go back to crafts */}
    <hr className="my-8" />
    <div className="flex flex-wrap gap-3">
    <Button variant="outline" asChild>
          <Link href="/crafts">
              {t('crafts.details.backToCrafts')}
          </Link>
    </Button> 
    </div>
    </Container>
    
    )
  }
