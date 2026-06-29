import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { GalleryHeader } from '@/components/sc/SectionHeader'

export default function ContentPage() {
    const t = useTranslations()

    return (
        <div className="sc-container py-12">
            <GalleryHeader eyebrow={t('navbar.about')} title={t('about.title')} />

            <div className="mt-2 flex max-w-3xl flex-col gap-6">
                <h2 className="sc-h2">{t('about.missionTitle')}</h2>
                <p className="sc-lead whitespace-pre-line">{t('about.missionDescription')}</p>
                <p className="sc-body whitespace-pre-line">{t('about.keyFeatures')}</p>

                <div>
                    <Link
                        href="https://github.com/karina-rodriguez/craft-authentication"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sc-btn sc-btn--primary"
                    >
                        {t('about.viewRepository')}
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
