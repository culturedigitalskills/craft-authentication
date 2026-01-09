'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle, Palette } from 'lucide-react'

export function TraditionSection() {
    const t = useTranslations('landing.tradition')

    return (
        <section className="py-16 px-4 bg-muted/30">
            <div className="max-w-6xl mx-auto">
                <div className="grid gap-12 md:grid-cols-2 items-center">
                    {/* Left Column - Image */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-muted shadow-xl order-2 md:order-1">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <Palette className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                <p className="text-sm">Artisan at Work</p>
                                <p className="text-xs">(Placeholder)</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Text */}
                    <div className="space-y-6 order-1 md:order-2">
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                            {t('title')}
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            {t('description')}
                        </p>

                        {/* Benefits List */}
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">
                                    {t('benefits.certificates')}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">
                                    {t('benefits.connection')}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">
                                    {t('benefits.supply')}
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    )
}
