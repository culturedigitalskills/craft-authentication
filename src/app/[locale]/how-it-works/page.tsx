import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
    ArrowRight,
    BadgeCheck,
    Clapperboard,
    FileSignature,
    Hammer,
    QrCode,
    ScanLine,
    ShieldCheck,
    UserRound,
    type LucideIcon,
} from 'lucide-react'

type Step = { title: string; body: string }

// One icon per step, in the order the copy lists them. Kept beside the render
// rather than in the catalogs so translators only ever handle words.
const VISITOR_ICONS: LucideIcon[] = [UserRound, Clapperboard, BadgeCheck, ShieldCheck]
const ARTISAN_ICONS: LucideIcon[] = [UserRound, Clapperboard, Hammer, QrCode]

/**
 * One page addressed to both audiences: someone who scanned a code or arrived
 * browsing, and an artisan deciding whether to join. Reached from the "See how
 * it works" call to action on the landing page.
 */
export default function HowItWorksPage() {
    const t = useTranslations('howItWorks')
    // "Authenticity, digitally verified" already says the right thing here, and
    // repeating it keeps the two pages speaking with one voice.
    const tHome = useTranslations('home')

    return (
        <div className="pb-16">
            {/* Header band, so the page opens with something more considered
                than a heading on bare paper. */}
            <header className="sc-dark" style={{ background: 'var(--sc-ink)' }}>
                <div className="sc-container py-14">
                    <p className="sc-eyebrow mb-3">
                        <ScanLine className="mr-1.5 inline h-3.5 w-3.5" />
                        {tHome('provenance.eyebrow')}
                    </p>
                    <h1 className="sc-h1" style={{ color: 'var(--sc-text-on-dark)' }}>
                        {t('title')}
                    </h1>
                    <p
                        className="sc-lead mt-5 max-w-2xl"
                        style={{ color: 'var(--sc-text-on-dark-muted)' }}
                    >
                        {t('subtitle')}
                    </p>
                </div>
            </header>

            <div className="sc-container flex flex-col gap-16 py-14">
                <Audience
                    badge={t('visitors.heading')}
                    lead={t('visitors.lead')}
                    steps={t.raw('visitors.steps') as Step[]}
                    icons={VISITOR_ICONS}
                    ctaLabel={t('visitors.cta')}
                    ctaHref="/verify"
                    accent="var(--sc-teal)"
                />

                <div className="flex items-center gap-4">
                    <span className="sc-rule" />
                    <FileSignature className="h-4 w-4" style={{ color: 'var(--sc-border-strong)' }} />
                    <span className="sc-rule" />
                </div>

                <Audience
                    badge={t('artisans.heading')}
                    lead={t('artisans.lead')}
                    steps={t.raw('artisans.steps') as Step[]}
                    icons={ARTISAN_ICONS}
                    ctaLabel={t('artisans.cta')}
                    ctaHref="/register"
                    accent="var(--sc-accent)"
                />
            </div>
        </div>
    )
}

function Audience({
    badge,
    lead,
    steps,
    icons,
    ctaLabel,
    ctaHref,
    accent,
}: {
    badge: string
    lead: string
    steps: Step[]
    icons: LucideIcon[]
    ctaLabel: string
    ctaHref: string
    accent: string
}) {
    return (
        <section>
            {/* The audience heading carries the section, so it stays an h2 and
                the steps below are h3. Styling it as a badge should not cost a
                screen reader the only landmark separating the two halves. */}
            <h2>
                <span className="sc-badge" style={{ ['--t' as string]: accent }}>
                    {badge}
                </span>
            </h2>
            <p className="sc-lead mt-4 max-w-2xl">{lead}</p>

            {/* Two columns on desktop so four steps read as a set rather than a
                long scroll, one column on phones. */}
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
                {steps.map((step, index) => {
                    const Icon = icons[index] ?? BadgeCheck
                    return (
                        <li key={step.title} className="sc-card h-full p-5">
                            <div className="mb-3 flex items-center gap-3">
                                <span
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                                    style={{
                                        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                                        color: accent,
                                    }}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span className="sc-meta" aria-hidden>
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                            </div>
                            <h3
                                className="mb-1.5 text-base font-semibold"
                                style={{ fontFamily: 'var(--sc-font-display)', color: 'var(--sc-ink)' }}
                            >
                                {step.title}
                            </h3>
                            <p className="sc-body" style={{ fontSize: '15px' }}>
                                {step.body}
                            </p>
                        </li>
                    )
                })}
            </ol>

            <Link href={ctaHref} className="sc-btn sc-btn--primary mt-7">
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
            </Link>
        </section>
    )
}
