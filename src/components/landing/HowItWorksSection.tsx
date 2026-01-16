'use client'

import { useTranslations } from 'next-intl'
import { Camera, QrCode, Smartphone, Globe } from 'lucide-react'
import { StepCard } from './StepCard'

export function HowItWorksSection() {
    const t = useTranslations('landing.howItWorks')

    return (
        <section className="py-16 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center space-y-4 mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('title')}</h2>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                        {t('subtitle')}
                    </p>
                </div>

                {/* Steps Grid */}
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    <StepCard
                        number={1}
                        icon={Camera}
                        title={t('steps.record.title')}
                        description={t('steps.record.description')}
                    />
                    <StepCard
                        number={2}
                        icon={QrCode}
                        title={t('steps.generate.title')}
                        description={t('steps.generate.description')}
                    />
                    <StepCard
                        number={3}
                        icon={Smartphone}
                        title={t('steps.scan.title')}
                        description={t('steps.scan.description')}
                    />
                    <StepCard
                        number={4}
                        icon={Globe}
                        title={t('steps.access.title')}
                        description={t('steps.access.description')}
                    />
                </div>
            </div>
        </section>
    )
}
