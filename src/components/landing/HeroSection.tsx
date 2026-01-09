'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Camera, QrCode, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeatureCard } from './FeatureCard'

export function HeroSection() {
    const locale = useLocale()
    const t = useTranslations('landing.hero')
    const tFeatures = useTranslations('landing.features')

    return (
        <section className="py-16 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="grid gap-12 md:grid-cols-2 items-center mb-16">
                    {/* Left Column - Text Content */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                                {t('title')}
                            </h1>
                            <h2 className="text-3xl sm:text-4xl font-semibold text-primary">
                                {t('subtitle')}
                            </h2>
                        </div>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            {t('description')}
                        </p>
                        <div className="flex flex-wrap gap-3 pt-4">
                            <Button asChild size="lg">
                                <Link href={`/${locale}/crafts`}>{t('exploreCrafts')}</Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href={`/${locale}/about`}>{t('learnMore')}</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Right Column - Hero Image */}
                    <div className="relative aspect-video md:aspect-square rounded-xl overflow-hidden bg-muted shadow-xl">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <Camera className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                <p className="text-sm">Artisan Working Image</p>
                                <p className="text-xs">(Placeholder)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Three Feature Pillars */}
                <div className="grid gap-6 md:grid-cols-3">
                    <FeatureCard
                        icon={Camera}
                        title={tFeatures('authentic.title')}
                        description={tFeatures('authentic.description')}
                    />
                    <FeatureCard
                        icon={QrCode}
                        title={tFeatures('traceable.title')}
                        description={tFeatures('traceable.description')}
                    />
                    <FeatureCard
                        icon={Globe}
                        title={tFeatures('connected.title')}
                        description={tFeatures('connected.description')}
                    />
                </div>
            </div>
        </section>
    )
}
