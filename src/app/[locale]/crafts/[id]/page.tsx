import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl'
import Link from 'next/link';
import { ArrowLeft, User, Calendar, QrCode, Eye, EyeOff, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCode } from '@/components/shared/qrcode';
import Gallery from '@/components/craft/Gallery'
import { QRCopyButton } from '@/components/craft/QRCopyButton'
import { verifyCraftVC, type CraftCredential } from '@/lib/did/vc'
import { craftCredentialId, getCraftMediaIds } from '@/lib/craft'
import { VerifiableCredentialCard } from '@/components/verifiableCredentialCard/page'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

const formatDate = (timestamp: string | Date) =>
  new Date(timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

export default async function OneCraftPage({ params, searchParams }: PageProps) {
    const session = await auth()
    const { id } = await params
    const { from } = await searchParams
    const backHref = from === 'mycrafts' ? '/crafts/mycrafts' : '/crafts'
    const currentPageUrl = `${process.env.AUTH_URL}/crafts/${id}`

    const craft = await prisma.craft.findFirst({
        where: { id, deletedAt: null },
        include: {
            artisan: { select: { userId: true, firstName: true, lastName: true, slug: true } },
        },
    })
    if (!craft) notFound()

    const isOwner = session?.user?.id === craft.artisan.userId
    const isAdmin = session?.user?.role === 'ADMIN'

    // Private crafts are only visible to their owner or a site admin.
    if (!craft.isPublic && !isOwner && !isAdmin) notFound()

    const mediaIds = await getCraftMediaIds(id)

    // Fetch and verify the craft's Verifiable Credential.
    const vcRecord = await prisma.verifiableCredential.findUnique({
        where: { credentialId: craftCredentialId(id) },
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

    return (
        <RenderOneCraftPage
            craft={craft}
            mediaIds={mediaIds}
            currentPageUrl={currentPageUrl}
            isOwner={isOwner || isAdmin}
            backHref={backHref}
            artisanName={`${craft.artisan.firstName} ${craft.artisan.lastName}`}
            artisanSlug={craft.artisan.slug}
            vcRecord={vcRecord ? {
                credentialId: vcRecord.credentialId,
                issuanceDate: vcRecord.issuanceDate,
                issuerDid: vcRecord.issuerDid,
                holderDid: vcRecord.holderDid,
            } : null}
            vcVerified={vcVerified}
        />
    )
}

interface VcData {
    credentialId: string
    issuanceDate: Date
    issuerDid: string
    holderDid: string
}

function RenderOneCraftPage({ craft, mediaIds, currentPageUrl, isOwner, backHref, artisanName, artisanSlug, vcRecord, vcVerified }:
  { craft: any, mediaIds: string[], currentPageUrl: string, isOwner: boolean, backHref: string, artisanName: string | null, artisanSlug: string | null, vcRecord: VcData | null, vcVerified: boolean | null }) {

    const t = useTranslations();
    const craftEditUrl = `create?id=${craft.id}`;
    const galleryImages = mediaIds.map((mediaId: string) => ({
      url: `/api/media/${mediaId}`,
      alt: craft.title,
    }))
    const galleryVideos: string[] = Array.isArray(craft.videos) ? craft.videos.filter(Boolean) : []

    return (
    <Container>
      {/* Top bar: back link + edit button */}
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref} aria-label={t('crafts.details.backToCrafts')}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
        {isOwner && (
          <Button asChild>
            <Link href={craftEditUrl}>{t('createCraft.editCraftTitle')}</Link>
          </Button>
        )}
      </div>

      {/* Full-width title header */}
      <div className="mb-8">
        <span className={`mb-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium
          ${craft.isPublic
            ? 'bg-warm/10 text-warm'
            : 'bg-muted text-muted-foreground'
          }`}>
          {craft.isPublic
            ? <><Eye className="h-3 w-3" /> {t('crafts.details.visible')}</>
            : <><EyeOff className="h-3 w-3" /> {t('crafts.details.notvisible')}</>
          }
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{craft.title}</h1>
      </div>

      {/* Two-column content */}
      <div className="grid gap-10 lg:grid-cols-2">

        {/* Left: gallery only */}
        <div>
          <Gallery images={galleryImages} videos={galleryVideos} />
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
                <p className="font-semibold">{artisanName}</p>
              )}
            </div>
          </div>

          {/* Description */}
          {craft.description && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('crafts.details.description')}
              </p>
              <p className="text-base leading-relaxed text-foreground/80">{craft.description}</p>
            </div>
          )}

          {/* Materials */}
          {craft.material && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('crafts.details.materials')}
              </p>
              <p className="text-base text-foreground/80">{craft.material}</p>
            </div>
          )}

          <div className="border-t border-border" />

          {/* Metadata */}
          <dl className="space-y-5">
            {craft.place && (
              <div>
                <dt className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {t('crafts.details.createdWhere')}
                </dt>
                <dd className="text-sm">
                  <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(craft.place)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-warm hover:underline"
                  >
                    {craft.place}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {t('crafts.details.createdOn')}
              </dt>
              <dd className="text-sm text-foreground/70">{formatDate(craft.createdAt)}</dd>
            </div>
            <div>
              <dt className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {t('crafts.details.updatedOn')}
              </dt>
              <dd className="text-sm text-foreground/70">{formatDate(craft.updatedAt)}</dd>
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
