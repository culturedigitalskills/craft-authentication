import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Container } from '@/components/layout/Container';
import { CardTitle, CardContent, CardDescription, CardHeader, Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/dist/client/link';
import Image from 'next/image';
import { Calendar, User } from 'lucide-react';
import { formatDateTime } from '@/components/formatDateTime';
import PaginationControls from '@/components/craft/PaginationControls'
import { cookies } from 'next/dist/server/request/cookies';
import { publicDecrypt } from 'crypto';
import { record } from 'zod/v3';


// export default async function CraftsPage() {
    // const session = await auth()        

    // if (!session) {
    //     redirect('/login')
    // }
    // return <CraftsPageContent session={session} />;

// }
// function CraftsPageContent({session}: {session: any}) {

export default async function CraftsPage(
  { searchParams }:
   { searchParams: { page?: string } }) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page) : 1

  const currentPageUrl = `${process.env.AUTH_URL}/crafts`
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()    

  try {
      // 1. fetch craft first
      const urldata =  `${process.env.AUTH_URL}/api/data/?page=${page}&limit=21`            
      const method = 'GET'
      // console.log('url: ', urldata) // Debug log to check data being submitted
      // console.log('method: ', method) // Debug log to check data being submitted

      const res = await fetch(urldata, {
        method,
        credentials: 'include',  // sends cookies automatically
        headers: { 
                  'Content-Type': 'application/json',
                  'Cookie': cookieHeader  // forward cookies to the API
              },
      })
      // console.log('I did it',res)
      if (!res.ok) 
        throw new Error('Request failed')  
      const data = await res.json()
      // console.log('full data:', JSON.stringify(data, null, 2))

      //******************GET all crafts
    const allcrafts = data.data
    const pagination = data.pagination  // { currentPage, totalPages, totalCount, hasNext, hasPrev }

    const crafts = await Promise.all(allcrafts.map(async (record: any) => {
      const mediaIds = record.data['mediaIds']?.filter((id: any) => id !== null) ?? []
      console.log('Media IDs:', mediaIds[0])
      let url = null

      if (mediaIds.length > 0) {
        const imageRes = await fetch(`${process.env.AUTH_URL}/api/media/${mediaIds[0]}`, {
          method: 'GET',
          headers: { 
            // 'Content-Type': 'application/json',
            'Cookie': cookieHeader
          },
        })
        url = await imageRes.url
        console.log('Image URL:', mediaIds[0], "   ", url)
      }else {
        url = null
      }

      return {
        id: record.id,
        title: record.name,
        createdOn: record.data.createdOn,
        email: record.data.artisan,
        isPublic: record.data.isPublic,
        mediaIds,
        imageUrl : url
      }
    }))

    
    return <RenderCraftsPage crafts={crafts} pagination={pagination} currentPage={page} currentPageUrl={currentPageUrl}/>

    //   // console.log('Response status:', res) // Debug log to check response status
    } catch (error) {
      console.log('Error:', error)
      console.log('Error message:', (error as Error).message)
      console.log('Error name:', (error as Error).name)
    }

}

function RenderCraftsPage({ crafts,  pagination, currentPage, currentPageUrl  }:
   { crafts: any[], pagination: any, currentPage: number, currentPageUrl: string }) {

    const t = useTranslations();

    return (
      // <div className="px-4 py-16"/>
        <Container>
        {/* <div className="px-4 py-16">
             */}
             <div className="mx-auto mb-12 max-w-3xl text-center">
                <h1 className="mb-8 text-4xl font-bold">{t('crafts.welcomeTitle')} </h1>
                <p className="text-lg text-muted-foreground">
                   {t('crafts.description')}
                </p>

            </div>
            {/* </div>
        </div> */}
        {/* Crafts Grid */}
       
        {crafts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {crafts.map((craft) => {
            // const owner = typeof craft.owner === 'object' ? craft.owner : null;
            // const image = typeof craft.image === 'object' ? craft.image : null;
            // const imageUrl = craft.image;
            // const ownerId = typeof craft.owner === 'object' ? craft.owner.id : craft.owner;
            const craftUrl = `crafts/${craft.id}`;
            console.log('HERE I AM :', craft.id, "   ", craft.imageUrl)
            return (
                <Card key={craft.id} className="group transition-shadow duration-200 hover:shadow-lg">
                <Link href={craftUrl} className="block">
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    {craft.imageUrl ? (
                      <Image
                        src={craft.imageUrl}
                        // src='http://localhost:20100/api/media/cc853642-5da8-4013-819f-4c4da2827425'
                        //src='https://upload.wikimedia.org/wikipedia/commons/2/2a/Pottenbakkersschijf.JPG'
                        alt={craft.title}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"

                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted">
                        <p className="text-muted-foreground">{t('crafts.explore.noImageAvailable')}</p>
                      </div>
                    )}
                    {/* <div className="absolute right-2 top-2">
                      <Badge variant="outline" className="bg-white/90 text-xs">
                        Public
                      </Badge>
                    </div> */}                    
                    </div>

                    {/* Content */}
                    <CardHeader className="pb-2 bg-muted">
                    <CardTitle className="line-clamp-1 transition-colors group-hover:text-primary">
                        {craft.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">{craft.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0 bg-muted">
                    <div className="space-y-2">
                    {/* Creator information */}                        
                    {craft.owner && (
                        <div className="flex items-center space-x-2 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{t('crafts.explore.by')}</span>
                          <span className="font-medium">{craft.email}</span>
                        </div>
                      )}
                    {/* Created date */}
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDateTime(craft.createdOn)}</span>
                      </div>                           
                    </div>
                    </CardContent>
                </Link>    
                </Card>
            );
            })}
    
      

        
        </div>
        
        ) : (
        <p className="text-center text-muted-foreground">No crafts found.</p>
        
        )}
      <PaginationControls 
        currentPage={currentPage} 
        pagination={pagination} 
        currentPageUrl={currentPageUrl} 
      />  
        </Container>
    )

}
