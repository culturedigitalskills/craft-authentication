import { useLocale, useTranslations } from 'next-intl'
import { GalleryHeader } from '@/components/sc/SectionHeader'
import { publicContacts } from '@/lib/public-contacts'

type Section = { heading: string; body: string }

export function LegalPage({ namespace }: { namespace: 'terms' | 'privacy' }) {
    const t = useTranslations(namespace)
    const tui = useTranslations('interface')
    const locale = useLocale()
    const contacts = publicContacts()
    const sections = t.raw('sections') as Section[]

    function body(text: string) {
        return text.split(/(\{privacyContact\}|\{legalContact\})/g).map((part, i) => {
            const contact =
                part === '{privacyContact}'
                    ? contacts.privacy
                    : part === '{legalContact}'
                      ? contacts.legal
                      : null
            return contact ? (
                <a key={i} href={contact.href} className="underline underline-offset-4">
                    {contact.label}
                </a>
            ) : (
                part
            )
        })
    }

    return (
        <div className="sc-container py-12">
            {locale !== 'en' && <p className="sc-body mb-6">{tui('legalEnglishOnly')}</p>}
            <article lang="en" dir="ltr">
                <GalleryHeader title={t('title')} description={t('intro')} />
                <div className="flex max-w-3xl flex-col gap-8">
                    <p className="sc-body text-sm opacity-70">{t('lastUpdated')}</p>
                    {sections.map((section) => (
                        <section key={section.heading}>
                            <h2 className="sc-h2 mb-3">{section.heading}</h2>
                            <p className="sc-body whitespace-pre-line">{body(section.body)}</p>
                        </section>
                    ))}
                </div>
            </article>
        </div>
    )
}
