'use client'

import { useTranslations } from 'next-intl'
import { Smartphone } from 'lucide-react'

export function QRTechnologySection() {
    const t = useTranslations('landing.qrTechnology')

    return (
        <section className="py-16 px-4 bg-muted/30">
            <div className="max-w-6xl mx-auto">
                <div className="grid gap-12 md:grid-cols-2 items-center">
                    {/* Left Column - Text */}
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-primary uppercase tracking-wide">
                            {t('eyebrow')}
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                            {t('title')}
                        </h2>
                        <p className="text-xl text-muted-foreground">
                            {t('description')}
                        </p>
                    </div>

                    {/* Right Column - Image */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-muted shadow-xl">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <Smartphone className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                <p className="text-sm">Phone Scanning QR Code</p>
                                <p className="text-xs">(Placeholder)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
