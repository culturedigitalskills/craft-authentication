import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useTranslations } from 'next-intl'
import Link from 'next/link';
import { ArrowLeft, User, Calendar, QrCode, Eye, EyeOff, MapPin } from 'lucide-react';
import { formatDateTime } from '@/components/shared/formatDateTime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCode } from '@/components/shared/qrcode';
import { cookies } from 'next/headers'
import Gallery from '@/components/craft/Gallery'
import { QRCopyButton } from '@/components/craft/QRCopyButton'
import { verifyCraftVC, type CraftCredential } from '@/lib/did/vc'
// CraftCredential used for proof type cast below
import { DOMAIN } from '@/lib/did/config'
import { VerifiableCredentialCard } from '@/components/verifiableCredentialCard/page'

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

    const currentPageUrl = `${process.env.AUTH_URL}/crafts/${id}`;
    try {
            const urldata = `${process.env.AUTH_URL}/api/data/${id}`
            const method = 'GET'

            const res = await fetch(urldata, {
                method,
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookieHeader,
                },
            })
            // console.log('I did it',res)
            if (!res.ok) 
                throw new Error('Request failed')            


            
            const data = await res.json()
            // Look up artisan name and slug from email
            const artisanEmail = data?.data['artisan'] as string | undefined
            let artisanName: string | null = null
            let artisanSlug: string | null = null
            if (artisanEmail) {
                const artisan = await prisma.artisan.findFirst({
                    where: { user: { email: artisanEmail } },
                    select: { firstName: true, lastName: true, slug: true },
                })
                if (artisan) {
                    artisanName = `${artisan.firstName} ${artisan.lastName}`
                    artisanSlug = artisan.slug
                }
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
              if (!imagesRes.ok)
                  throw new Error('Image request failed')
              return imagesRes
            }))       
          }
              
            // 4. fetch and verify the craft's Verifiable Credential
            const credentialId = `${DOMAIN}/credentials/crafts/${id}`
            const vcRecord = await prisma.verifiableCredential.findUnique({
                where: { credentialId },
            })

            let vcVerified: boolean | null = null
            if (vcRecord) {
                const proof = vcRecord.proof as CraftCredential['proof']
                const result = await verifyCraftVC(
                    vcRecord.credentialSubject as object,
                    proof,
                    vcRecord.issuerDid,
                    proof.created,
                )
                vcVerified = result.verified
            }

            return <RenderOneCraftPage craft={data}
            images={images}
            currentPageUrl={currentPageUrl}
            user={session?.user.email ?? null}
            backHref={backHref}
            artisanName={artisanName}
            artisanSlug={artisanSlug}
            vcRecord={vcRecord ? {
                credentialId: vcRecord.credentialId,
                issuanceDate: vcRecord.issuanceDate,
                issuerDid: vcRecord.issuerDid,
                holderDid: vcRecord.holderDid,
            } : null}
            vcVerified={vcVerified}
             />
        } catch {
          return (
            <Container>
              <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
                <p className="text-muted-foreground">Could not load this craft. Please try again.</p>
                <Button asChild variant="outline">
                  <Link href="/crafts">Back to Crafts</Link>
                </Button>
              </div>
            </Container>
          )
        }
}

interface VcData {
    credentialId: string
    issuanceDate: Date
    issuerDid: string
    holderDid: string
}

function RenderOneCraftPage({craft, images, currentPageUrl, user, backHref, artisanName, artisanSlug, vcRecord, vcVerified}:
  {craft: any, images: any, currentPageUrl: string, user: any, backHref: string, artisanName: string | null, artisanSlug: string | null, vcRecord: VcData | null, vcVerified: boolean | null}) {

    const t = useTranslations();
    const craftEditUrl = `create?id=${craft.id}`;
    const galleryImages = images?.map((image: any) => ({
      url: image.url,
      alt: image.name ?? craft?.data['name'],
    })) ?? []

    return (
    <Container>
      {/* Top bar: back link + edit button */}
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref} aria-label={t('crafts.details.backToCrafts')}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
        {user === craft?.data['artisan'] && (
          <Button asChild>
            <Link href={craftEditUrl}>{t('createCraft.editCraftTitle')}</Link>
          </Button>
        )}
      </div>

      {/* Full-width title header */}
      <div className="mb-8">
        <span className={`mb-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium
          ${craft?.data['isPublic']
            ? 'bg-warm/10 text-warm'
            : 'bg-muted text-muted-foreground'
          }`}>
          {craft?.data['isPublic']
            ? <><Eye className="h-3 w-3" /> {t('crafts.details.visible')}</>
            : <><EyeOff className="h-3 w-3" /> {t('crafts.details.notvisible')}</>
          }
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{craft?.name}</h1>
      </div>

      {/* Two-column content */}
      <div className="grid gap-10 lg:grid-cols-2">

        {/* Left: gallery only */}
        <div>
          <Gallery images={galleryImages} />
        </div>

        {/* Right: details */}
        <div className="space-y-10">

          {/* Artisan */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('crafts.details.createdBy')}</p>
              {artisanSlug ? (
                <Link href={`/artisans/${artisanSlug}`} className="font-semibold hover:text-warm transition-colors">
                  {artisanName}
                </Link>
              ) : (
                <p className="font-semibold">{artisanName ?? craft?.data['artisan']}</p>
              )}
            </div>
          </div>

          {/* Description */}
          {craft?.description && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('crafts.details.description')}
              </p>
              <p className="text-base leading-relaxed text-foreground/80">{craft.description}</p>
            </div>
          )}

          {/* Materials */}
          {craft?.data['material'] && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('crafts.details.materials')}
              </p>
              <p className="text-base text-foreground/80">{craft?.data['material']}</p>
            </div>
          )}

          <div className="border-t border-border" />

          {/* Metadata */}
          <dl className="space-y-5">
            {craft?.data['place'] && (
              <div>
                <dt className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {t('crafts.details.createdWhere')}
                </dt>
                <dd className="text-sm">
                  <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(craft?.data['place'])}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-warm hover:underline"
                  >
                    {craft?.data['place']}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {t('crafts.details.createdOn')}
              </dt>
              <dd className="text-sm text-foreground/70">{formatDate(craft?.data['createdOn'])}</dd>
            </div>
            <div>
              <dt className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {t('crafts.details.updatedOn')}
              </dt>
              <dd className="text-sm text-foreground/70">{formatDate(craft?.data['updatedOn'])}</dd>
            </div>
          </dl>

          {/* QR Code card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="h-4 w-4" />
                {t('crafts.details.qrCodeTitle')}
              </CardTitle>
              <CardDescription>{t('crafts.details.qrScanGuidance')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="rounded-lg border bg-background p-3">
                <QRCode data={currentPageUrl} foreground={'oklch(0.2 0.1406 223.41)'} background={'oklch(1.00 0.000 70)'} margin={2} />
              </div>
              <p className="max-w-xs break-all text-center text-xs text-muted-foreground">
                {currentPageUrl}
              </p>
              <QRCopyButton url={currentPageUrl} label={t('crafts.details.copyLink')} copiedLabel={t('crafts.details.linkCopied')} />
              <VerifiableCredentialCard
                credentialId={vcRecord?.credentialId ?? null}
                issuanceDate={vcRecord?.issuanceDate ?? null}
                issuerName="Sustainable Crafting Registry"
                holderDid={vcRecord?.holderDid ?? null}
                verified={vcVerified}
                craftId={craft.id ?? null}
              />
            </CardContent>
          </Card>

        </div>
      </div>
    </Container>
    )
  }
