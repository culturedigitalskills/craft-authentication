import { useTranslations } from 'next-intl'
import { GalleryHeader } from '@/components/sc/SectionHeader'

type Section = { heading: string; body: string }

/**
 * Renders a policy document from a message namespace shaped as
 * `{ title, lastUpdated, intro, sections: [{ heading, body }] }`.
 *
 * The legal text is authored in English only; other locales fall back to it
 * through the merge in src/i8n/requests.tsx, so a translated site still shows a
 * complete policy rather than a raw key path.
 */
export function LegalPage({ namespace }: { namespace: 'terms' | 'privacy' }) {
    const t = useTranslations(namespace)
    const tLegal = useTranslations('legal')
    const sections = t.raw('sections') as Section[]

    return (
        <div className="sc-container py-12">
            <GalleryHeader
                eyebrow={tLegal('eyebrow')}
                title={t('title')}
                description={t('intro')}
            />

            <div className="flex max-w-3xl flex-col gap-8">
                <p className="sc-body text-sm opacity-70">{t('lastUpdated')}</p>

                {sections.map((section) => (
                    <section key={section.heading}>
                        <h2 className="sc-h2 mb-3">{section.heading}</h2>
                        <p className="sc-body whitespace-pre-line">{section.body}</p>
                    </section>
                ))}
            </div>
        </div>
    )
}
