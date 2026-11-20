import { publicMetadata } from '@/i8n/seo'
import { getTranslations } from 'next-intl/server'
import { LegalPage } from '@/components/shared/LegalPage'

export default function TermsPage() {
    return <LegalPage namespace="terms" />
}

export async function generateMetadata() {
    const t = await getTranslations({ locale: 'en', namespace: 'terms' })
    return publicMetadata('/terms', 'en', t('title'), t('intro'))
}
