import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { GalleryHeader } from '@/components/sc/SectionHeader'

type Step = { title: string; body: string }

/**
 * One page addressed to both audiences: someone who scanned a code or arrived
 * browsing, and an artisan deciding whether to join. The landing hero sends
 * people here, since its other calls to action only lead to the listings.
 */
export default function HowItWorksPage() {
    const t = useTranslations('howItWorks')

    return (
        <div className="sc-container py-12">
            <GalleryHeader
                eyebrow={t('title')}
                title={t('title')}
                description={t('subtitle')}
            />

            <div className="flex max-w-3xl flex-col gap-12">
                <Audience
                    heading={t('visitors.heading')}
                    lead={t('visitors.lead')}
                    steps={t.raw('visitors.steps') as Step[]}
                    ctaLabel={t('visitors.cta')}
                    ctaHref="/verify"
                />
                <Audience
                    heading={t('artisans.heading')}
                    lead={t('artisans.lead')}
                    steps={t.raw('artisans.steps') as Step[]}
                    ctaLabel={t('artisans.cta')}
                    ctaHref="/register"
                />
            </div>
        </div>
    )
}

function Audience({
    heading,
    lead,
    steps,
    ctaLabel,
    ctaHref,
}: {
    heading: string
    lead: string
    steps: Step[]
    ctaLabel: string
    ctaHref: string
}) {
    return (
        <section>
            <h2 className="sc-h2 mb-2">{heading}</h2>
            <p className="sc-body mb-6">{lead}</p>

            <ol className="flex flex-col gap-5">
                {steps.map((step, index) => (
                    <li key={step.title} className="flex gap-4">
                        <span
                            aria-hidden
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                            style={{ background: 'var(--sc-accent)', color: 'var(--sc-text-on-dark)' }}
                        >
                            {index + 1}
                        </span>
                        <div>
                            <h3 className="mb-1 font-semibold" style={{ fontFamily: 'var(--sc-font-display)' }}>
                                {step.title}
                            </h3>
                            <p className="sc-body">{step.body}</p>
                        </div>
                    </li>
                ))}
            </ol>

            <Link href={ctaHref} className="sc-btn sc-btn--primary mt-6">
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
            </Link>
        </section>
    )
}
