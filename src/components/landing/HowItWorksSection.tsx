import { useTranslations } from 'next-intl'
import { Camera, QrCode, Smartphone, Globe, type LucideIcon } from 'lucide-react'

type Step = {
    num: string
    Icon: LucideIcon
    title: string
    description: string
}

export function HowItWorksSection() {
    const t = useTranslations('')

    const steps: Step[] = [
        {
            num: '01',
            Icon: Camera,
            title: t('howItWorks.steps.record.title'),
            description: t('howItWorks.steps.record.description'),
        },
        {
            num: '02',
            Icon: QrCode,
            title: t('howItWorks.steps.generate.title'),
            description: t('howItWorks.steps.generate.description'),
        },
        {
            num: '03',
            Icon: Smartphone,
            title: t('howItWorks.steps.scan.title'),
            description: t('howItWorks.steps.scan.description'),
        },
        {
            num: '04',
            Icon: Globe,
            title: t('howItWorks.steps.access.title'),
            description: t('howItWorks.steps.access.description'),
        },
    ]

    return (
        <section className="py-16 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Left-aligned header — breaks the centered monotony */}
                <div className="mb-16 max-w-xl">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                        {t('howItWorks.title')}
                    </h2>
                    <p className="text-base text-muted-foreground leading-relaxed">
                        {t('howItWorks.subtitle')}
                    </p>
                </div>

                {/* Steps — horizontal timeline on desktop, stacked on mobile */}
                <div className="relative grid gap-10 lg:grid-cols-4 lg:gap-6">
                    {/* Connecting line spans between step indicator centers */}
                    <div
                        className="hidden lg:block absolute h-px bg-border"
                        style={{ top: '1.0625rem', left: '1.0625rem', right: '1.0625rem' }}
                        aria-hidden="true"
                    />

                    {steps.map((step, i) => {
                        const isPayoff = i === steps.length - 1
                        return (
                            <div key={step.num} className="flex lg:flex-col gap-5 lg:gap-0">
                                {/* Step number — sits on top of the connecting line */}
                                <div
                                    className={`relative z-10 shrink-0 flex items-center justify-center w-[2.125rem] h-[2.125rem] rounded-full text-sm font-bold tabular-nums ${isPayoff ? 'bg-warm text-warm-foreground shadow-sm' : 'bg-background border-2 border-border text-muted-foreground'}`}
                                    style={undefined}
                                    aria-label={`Step ${step.num}`}
                                >
                                    {step.num}
                                </div>

                                {/* Step content */}
                                <div className="flex-1 lg:mt-8">
                                    <step.Icon
                                        className={`mb-3 h-5 w-5 ${isPayoff ? 'text-warm' : 'text-muted-foreground/50'}`}
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                    />
                                    <h3 className={`font-semibold text-base mb-2 ${isPayoff ? 'text-warm' : ''}`}>
                                        {step.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
