'use client'

import { useTranslations } from 'next-intl'
import { QrCode } from 'lucide-react'
import { QRCode } from '@/components/shared/qrcode'
import { QRCopyButton } from '@/components/craft/QRCopyButton'

/**
 * The artisan's own QR code, encoding their public profile URL so a scan lands
 * on their story rather than on a listing. Printed and attached to work, it is
 * how someone holding a finished piece finds the person who made it.
 *
 * The URL survives a rename: slug changes are redirected through the artisan's
 * previousSlugs, so a code already printed keeps working.
 */
export function ArtisanQRCard({ profileUrl }: { profileUrl: string }) {
    const t = useTranslations('profile.qr')

    return (
        <div className="sc-card p-6">
            <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-warm">
                <QrCode className="h-4 w-4" />
                {t('title')}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">{t('guidance')}</p>

            <div className="flex flex-col items-center gap-4">
                <QRCode
                    data={profileUrl}
                    foreground={'#20303f'}
                    background={'#fdfcfa'}
                    margin={2}
                    downloadLabel={t('download')}
                    downloadName="my-profile-qr"
                />
                <QRCopyButton
                    url={profileUrl}
                    label={t('copyLink')}
                    copiedLabel={t('linkCopied')}
                />
            </div>
        </div>
    )
}
