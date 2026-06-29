import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { useTranslations } from 'next-intl'
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, QrCode, Eye, EyeOff, MapPin, Pencil, Clock, Ruler, Scale, Heart, ShieldCheck } from 'lucide-react';
import { QRCode } from '@/components/shared/qrcode';
import Gallery from '@/components/craft/Gallery'
import { QRCopyButton } from '@/components/craft/QRCopyButton'
import { verifyCraftVC, type CraftCredential } from '@/lib/did/vc'
import { craftCredentialId, getCraftMediaItems } from '@/lib/craft'
import { VerifiableCredentialCard } from '@/components/verifiableCredentialCard/page'
import { notFound } from 'next/navigation'
import { ScMedia } from '@/components/sc/ScMedia'
import { PortraitFallback } from '@/components/sc/fallbacks'
import { SectionHeader } from '@/components/sc/SectionHeader'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

const formatMonthYear = (timestamp: string | Date) =>
  new Date(timestamp).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

export default async function OneCraftPage({ params, searchParams }: PageProps) {
    const session = await auth()
    const { id } = await params
    const { from } = await searchParams
    const fromMyCrafts = from === 'mycrafts'
    const backHref = fromMyCrafts ? '/crafts/mycrafts' : '/crafts'
    const currentPageUrl = `${process.env.AUTH_URL}/crafts/${id}`

    const craft = await prisma.craft.findFirst({
        where: { id, deletedAt: null },
        include: {
            artisan: {
                select: {
                    userId: true,
                    firstName: true,
                    lastName: true,
                    slug: true,
                    bio: true,
                    yearsOfExperience: true,
                    learningSource: true,
                },
            },
        },
    })
    if (!craft) notFound()

    const isOwner = session?.user?.id === craft.artisan.userId
    const isAdmin = session?.user?.role === 'ADMIN'

    // Private crafts are only visible to their owner or a site admin.
    if (!craft.isPublic && !isOwner && !isAdmin) notFound()

    const mediaItems = await getCraftMediaItems(id)
    const imageIds = mediaItems.filter(m => !m.mimeType?.startsWith('video/')).map(m => m.mediaId)
    const videoFileIds = mediaItems.filter(m => m.mimeType?.startsWith('video/')).map(m => m.mediaId)

    // The maker's profile photo, shown in the "Meet the maker" feature.
    const artisanPhoto = await prisma.mediaAttachment.findFirst({
        where: { entityType: 'Artisan', entityId: craft.artisanId, attachmentType: 'HERO', isPrimary: true },
        select: { mediaId: true },
    })
    const artisanPhotoUrl = artisanPhoto ? `/api/media/${artisanPhoto.mediaId}` : null

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
            imageIds={imageIds}
            videoFileIds={videoFileIds}
            currentPageUrl={currentPageUrl}
            isOwner={isOwner || isAdmin}
            showQr={fromMyCrafts}
            backHref={backHref}
            artisanName={`${craft.artisan.firstName} ${craft.artisan.lastName}`}
            artisanSlug={craft.artisan.slug}
            artisanPhotoUrl={artisanPhotoUrl}
            artisanBio={craft.artisan.bio}
            artisanYears={craft.artisan.yearsOfExperience}
            artisanLearningSource={craft.artisan.learningSource}
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

function RenderOneCraftPage({ craft, imageIds, videoFileIds, currentPageUrl, isOwner, showQr, backHref, artisanName, artisanSlug, artisanPhotoUrl, artisanBio, artisanYears, artisanLearningSource, vcRecord, vcVerified }:
  { craft: any, imageIds: string[], videoFileIds: string[], currentPageUrl: string, isOwner: boolean, showQr: boolean, backHref: string, artisanName: string | null, artisanSlug: string | null, artisanPhotoUrl: string | null, artisanBio: string | null, artisanYears: number | null, artisanLearningSource: string | null, vcRecord: VcData | null, vcVerified: boolean | null }) {

    const t = useTranslations();
    const craftEditUrl = `create?id=${craft.id}`;
    const galleryImages = imageIds.map((mediaId: string) => ({
      url: `/api/media/${mediaId}`,
      alt: craft.title,
    }))
    const galleryVideoFiles = videoFileIds.map((mediaId: string) => ({
      url: `/api/media/${mediaId}`,
      alt: craft.title,
    }))
    const galleryVideos: string[] = Array.isArray(craft.videos) ? craft.videos.filter(Boolean) : []

    // Compose human-readable size / weight strings from whichever values exist.
    const dims = [craft.width, craft.height, craft.depth].filter((v: number | null) => v != null)
    const dimensionsText = dims.length ? `${dims.join(' × ')} ${craft.dimensionUnit ?? ''}`.trim() : null
    const weightText = craft.weight != null ? `${craft.weight} ${craft.weightUnit ?? ''}`.trim() : null

    // Embedded OpenStreetMap for the (approximate) place of making.
    const lat = craft.latitude
    const lon = craft.longitude
    const hasMap = craft.isSharedLocation && lat != null && lon != null
    const mapDelta = 0.02
    const mapSrc = hasMap
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${lon - mapDelta},${lat - mapDelta},${lon + mapDelta},${lat + mapDelta}&layer=mapnik&marker=${lat},${lon}`
        : null
    const mapLink = hasMap
        ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`
        : null

    // Key stats — time to make leads, then size and weight (only those present).
    const stats = [
        craft.timeToMake ? { Icon: Clock, value: craft.timeToMake, label: t('crafts.details.timeToMake') } : null,
        dimensionsText ? { Icon: Ruler, value: dimensionsText, label: t('crafts.details.dimensions') } : null,
        weightText ? { Icon: Scale, value: weightText, label: t('crafts.details.weight') } : null,
    ].filter(Boolean) as { Icon: typeof Clock; value: string; label: string }[]

    return (
      <>
        {/* ── Split hero: media left, sticky info rail right ── */}
        <div className="sc-container py-8">
          <Link href={backHref} className="sc-btn sc-btn--ghost mb-6">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('crafts.details.backToCrafts')}
          </Link>

          <div className="sc-split">
            {/* Media */}
            <div
              className="overflow-hidden bg-[var(--sc-surface)] p-3 sm:p-4"
              style={{ borderRadius: 'var(--sc-r-hero)', boxShadow: 'var(--sc-shadow-hero)', border: '1px solid var(--sc-border)' }}
            >
              <Gallery images={galleryImages} videoFiles={galleryVideoFiles} videos={galleryVideos} />
            </div>

            {/* Info rail */}
            <aside className="sc-sticky flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="sc-eyebrow">{t('navbar.crafts')}</p>
                  {isOwner && (
                    <span
                      className="inline-flex items-center gap-1 rounded-[var(--sc-r-chip)] px-2.5 py-1 text-xs font-semibold"
                      style={craft.isPublic
                        ? { background: 'var(--sc-accent)', color: '#fff8ee' }
                        : { background: 'var(--sc-paper-lo)', color: 'var(--sc-text-muted)' }}
                    >
                      {craft.isPublic
                        ? <><Eye className="h-3 w-3" /> {t('crafts.details.visible')}</>
                        : <><EyeOff className="h-3 w-3" /> {t('crafts.details.notvisible')}</>}
                    </span>
                  )}
                </div>
                <h1 className="sc-h1 mt-2" style={{ fontSize: '40px' }}>{craft.title}</h1>
                {artisanName && (
                  <p className="sc-body mt-2">
                    {t('crafts.explore.by')}{' '}
                    {artisanSlug ? (
                      <Link href={`/artisans/${artisanSlug}`} className="font-medium hover:text-[color:var(--sc-accent)]" style={{ color: 'var(--sc-text)' }}>
                        {artisanName}
                      </Link>
                    ) : <span style={{ color: 'var(--sc-text)' }}>{artisanName}</span>}
                  </p>
                )}
              </div>

              {/* Stat strip — time · dimensions · weight */}
              {stats.length > 0 && (
                <div className="flex overflow-hidden rounded-[var(--sc-r-card)]" style={{ border: '1px solid var(--sc-border)' }}>
                  {stats.map((s, i) => (
                    <div
                      key={i}
                      className="flex-1 p-4"
                      style={i > 0 ? { borderLeft: '1px solid var(--sc-border)' } : undefined}
                    >
                      <s.Icon className="h-4 w-4" style={{ color: 'var(--sc-accent)' }} />
                      <p className="mt-2 leading-tight" style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '17px', color: 'var(--sc-ink)' }}>{s.value}</p>
                      <p className="sc-meta mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Maker mini-card */}
              <div className="sc-card flex items-center gap-3 p-4">
                <div
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full"
                  style={{ border: '2px solid var(--sc-surface)', boxShadow: 'var(--sc-shadow-card)' }}
                >
                  <ScMedia
                    src={artisanPhotoUrl}
                    alt={artisanName ?? ''}
                    fallback={<PortraitFallback name={artisanName} />}
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="sc-meta">{t('crafts.details.createdBy')}</p>
                  <p className="truncate" style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '17px', color: 'var(--sc-ink)' }}>
                    {artisanSlug ? (
                      <Link href={`/artisans/${artisanSlug}`} className="hover:text-[color:var(--sc-accent)]">{artisanName}</Link>
                    ) : artisanName}
                  </p>
                  {artisanYears != null && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: 'var(--sc-text-muted)' }}>
                      <Clock className="h-3 w-3" />{artisanYears} {t('crafts.details.yearsExperience')}
                    </p>
                  )}
                </div>
                {artisanSlug && (
                  <Link href={`/artisans/${artisanSlug}`} className="shrink-0" aria-label={t('crafts.details.viewProfile')} style={{ color: 'var(--sc-accent)' }}>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                )}
              </div>

              {isOwner && (
                <Link href={craftEditUrl} className="sc-btn sc-btn--primary justify-center">
                  <Pencil className="h-4 w-4" />
                  {t('createCraft.editCraftTitle')}
                </Link>
              )}
            </aside>
          </div>
        </div>

        {/* ── Inspiration band (tinted) ── */}
        {craft.inspiration && (
          <section
            className="my-4 border-y py-16"
            style={{ background: 'color-mix(in srgb, var(--sc-accent) 6%, var(--sc-paper))', borderColor: 'color-mix(in srgb, var(--sc-accent) 18%, transparent)' }}
          >
            <div className="sc-container">
              <p className="sc-eyebrow mb-4">{t('crafts.details.inspiration')}</p>
              <blockquote className="sc-quote max-w-3xl whitespace-pre-line" style={{ fontSize: '34px' }}>
                {craft.inspiration}
              </blockquote>
            </div>
          </section>
        )}

        {/* ── Editorial body: narrative + details rail ── */}
        <div className="sc-container py-12">
          <div className="sc-split">
            <div className="flex flex-col gap-8">
              {craft.description && (
                <p className="sc-lead whitespace-pre-line">{craft.description}</p>
              )}

              {(craft.materials || craft.technique) && (
                <div>
                  <SectionHeader title={t('crafts.details.theMaking')} className="mb-5" />
                  <div className="flex flex-col gap-6">
                    {craft.materials && (
                      <div>
                        <p className="sc-meta mb-2">{t('crafts.details.materials')}</p>
                        <p className="sc-body whitespace-pre-line">{craft.materials}</p>
                      </div>
                    )}
                    {craft.technique && (
                      <div>
                        <p className="sc-meta mb-2">{t('crafts.details.technique')}</p>
                        <p className="sc-body whitespace-pre-line">{craft.technique}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Details rail */}
            <aside className="flex flex-col gap-6">
              <div className="sc-card flex flex-col gap-6 p-6">
                {(hasMap || craft.place) && (
                  <div>
                    <p className="sc-meta mb-2 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {t('crafts.details.createdWhere')}
                    </p>
                    {craft.place && <p className="mb-2 text-sm font-medium" style={{ color: 'var(--sc-text)' }}>{craft.place}</p>}
                    {hasMap && mapSrc && (
                      <>
                        <iframe
                          title={t('crafts.details.createdWhere')}
                          src={mapSrc}
                          className="h-56 w-full rounded-[var(--sc-r-btn)]"
                          style={{ border: '1px solid var(--sc-border)' }}
                          loading="lazy"
                        />
                        <a href={mapLink!} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs hover:underline" style={{ color: 'var(--sc-accent)' }}>
                          {t('crafts.details.viewLargerMap')}
                        </a>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <p className="sc-meta mb-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {t('crafts.details.added')}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--sc-text-soft)' }}>{formatMonthYear(craft.createdAt)}</p>
                </div>
              </div>

              {craft.careInstructions && (
                <div
                  className="rounded-[var(--sc-r-card)] p-5"
                  style={{ background: 'color-mix(in srgb, var(--sc-accent) 5%, var(--sc-surface))', border: '1px solid color-mix(in srgb, var(--sc-accent) 20%, transparent)' }}
                >
                  <p className="sc-eyebrow mb-2 flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5" />
                    {t('crafts.details.careInstructions')}
                  </p>
                  <p className="sc-body whitespace-pre-line" style={{ fontSize: '14px' }}>{craft.careInstructions}</p>
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* ── Authenticity / provenance (dark closing band) ── */}
        <section className="sc-dark py-16">
          <div className="sc-container">
            <p className="sc-eyebrow mb-2">{t('crafts.details.authenticity')}</p>
            <h2 className="sc-h2 mb-8" style={{ color: 'var(--sc-text-on-dark)' }}>{t('crafts.details.certificateTitle')}</h2>
            <div className={`grid gap-6 ${showQr ? 'md:grid-cols-2' : ''}`}>
              {/* QR — only shown to the crafter (accessed via ?from=mycrafts) */}
              {showQr && (
                <div className="sc-dark-panel p-6">
                  <h3 className="mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '18px', color: 'var(--sc-text-on-dark)' }}>
                    <QrCode className="h-4 w-4" style={{ color: 'var(--sc-accent-warm)' }} />
                    {t('crafts.details.qrTitle')}
                  </h3>
                  <p className="mb-4 text-sm" style={{ color: 'var(--sc-text-on-dark-muted)' }}>{t('crafts.details.qrScanGuidance')}</p>
                  <div className="flex flex-col items-center gap-4">
                    <QRCode data={currentPageUrl} foreground={'#20303f'} background={'#fdfcfa'} margin={2} />
                    {/* <p className="max-w-xs break-all text-center text-xs" style={{ color: 'var(--sc-text-on-dark-muted)' }}>{currentPageUrl}</p> */}
                    {/* <QRCopyButton url={currentPageUrl} label={t('crafts.details.copyLink')} copiedLabel={t('crafts.details.linkCopied')} /> */}
                  </div>
                </div>
              )}

              {/* Certificate of Authenticity */}
              <div className="sc-dark-panel p-6">
                <h3 className="mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--sc-font-display)', fontWeight: 600, fontSize: '18px', color: 'var(--sc-text-on-dark)' }}>
                  <ShieldCheck className="h-4 w-4" style={{ color: 'var(--sc-accent-warm)' }} />
                  {t('crafts.details.certificateTitle')}
                </h3>
                <p className="mb-4 text-sm" style={{ color: 'var(--sc-text-on-dark-muted)' }}>{t('crafts.details.certificateDescription')}</p>
                <VerifiableCredentialCard
                  credentialId={vcRecord?.credentialId ?? null}
                  issuanceDate={vcRecord?.issuanceDate ?? null}
                  issuerName="Sustainable Crafting Registry"
                  holderDid={vcRecord?.holderDid ?? null}
                  verified={vcVerified}
                  craftId={craft.id ?? null}
                />
              </div>
            </div>
          </div>
        </section>
      </>
    )
  }
