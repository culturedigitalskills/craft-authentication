import { publicMetadata } from '@/i8n/seo'
import { getTranslations } from 'next-intl/server'
import { LegalPage } from '@/components/shared/LegalPage'

export default function PrivacyPage() {
    return <LegalPage namespace="privacy" />
}

export async function generateMetadata() {
    const t = await getTranslations({ locale: 'en', namespace: 'privacy' })
    return publicMetadata('/privacy', 'en', t('title'), t('intro'))
}
