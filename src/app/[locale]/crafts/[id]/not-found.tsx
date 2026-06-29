import Link from 'next/link'
import { PackageX } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

// Rendered when a craft id can't be resolved — most often because the craft was
// deleted (e.g. an old link or a printed QR code pointing at a removed craft).
export default async function CraftNotFound() {
    const t = await getTranslations('crafts.notFound')
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <PackageX className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-2xl font-bold">{t('title')}</h2>
            <p className="mb-6 max-w-md text-muted-foreground">{t('body')}</p>
            <Link
                href="/crafts"
                className="rounded-md bg-warm px-6 py-2.5 text-sm font-medium text-warm-foreground transition-colors hover:bg-warm/90"
            >
                {t('browse')}
            </Link>
        </div>
    )
}
