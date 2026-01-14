'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Camera, QrCode, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HeroSection() {
    const locale = useLocale()
    const t = useTranslations('landing.hero')
    const tFeatures = useTranslations('landing.features')

    return (
        <section className="bg-gradient-to-br from-background to-muted/20 py-16 px-4">
            <div className="container mx-auto max-w-6xl">
                <div className="grid gap-12 md:grid-cols-2 items-center">
                    {/* Left Column - Text Content */}
                    <div>
                        <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
                            {t('title')}
                        </h1>
                        <h2 className="mb-6 text-4xl font-bold leading-tight md:text-3xl">
                            <span className="block text-primary">{t('subtitle')}</span>
                        </h2>
                        <p className="mb-8 text-xl leading-relaxed text-muted-foreground">
                            {t('description')}
                        </p>
                        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
                            <Button size="lg" className="px-8" asChild>
                                <Link href={`/${locale}/crafts`}>{t('exploreCrafts')}</Link>
                            </Button>
                            <Button variant="outline" size="lg" className="px-8" asChild>
                                <Link href={`/${locale}/about`}>{t('learnMore')}</Link>
                            </Button>
                        </div>

                        {/* Three icons below the description */}
                        <div className="grid grid-cols-3 gap-8 border-t pt-8">
                            <div className="text-center">
                                <Camera className="mx-auto mb-2 h-8 w-8 text-primary" />
                                <p className="font-medium">{tFeatures('authentic.title')}</p>
                                <p className="text-sm text-muted-foreground">{tFeatures('authentic.description')}</p>
                            </div>
                            <div className="text-center">
                                <QrCode className="mx-auto mb-2 h-8 w-8 text-primary" />
                                <p className="font-medium">{tFeatures('traceable.title')}</p>
                                <p className="text-sm text-muted-foreground">{tFeatures('traceable.description')}</p>
                            </div>
                            <div className="text-center">
                                <Globe className="mx-auto mb-2 h-8 w-8 text-primary" />
                                <p className="font-medium">{tFeatures('connected.title')}</p>
                                <p className="text-sm text-muted-foreground">{tFeatures('connected.description')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Hero Image */}
                    <div className="relative">
                        <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                            <div className="relative aspect-video md:aspect-square rounded-xl overflow-hidden bg-muted">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center text-muted-foreground">
                                        <Camera className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                        <p className="text-sm">Artisan Working Image</p>
                                        <p className="text-xs">(Placeholder)</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>

                        {/* Floating QR Code Card */}
                        <div className="absolute -bottom-6 -left-6 rounded-xl border bg-white p-4 shadow-lg">
                            <div className="flex items-center space-x-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                                    <QrCode className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{t('qrCard.title')}</p>
                                    <p className="text-xs text-muted-foreground">{t('qrCard.description')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
