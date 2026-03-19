import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Camera, QrCode, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import ReactDOM from 'react-dom';
import {QRCodeSVG} from 'qrcode.react';


export function HeroSection() {
    const t = useTranslations()

    return (
        <section className="bg-gradient-to-br from-background to-muted/20 ">
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
                            {t('landing.description')}
                        </p>
                        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
                            <Button size="lg" className="px-8" asChild>
                                <Link href={`crafts`}>{t('landing.exploreCrafts')}</Link>
                            </Button>
                            <Button variant="outline" size="lg" className="px-8" asChild>
                                <Link href={`/about`}>{t('landing.learnMore')}</Link>
                            </Button>
                        </div>

                        {/* Three icons below the description */}
                        <div className="grid grid-cols-3 gap-8 border-t pt-8">
                            <div className="text-center">
                                <Camera className="mx-auto mb-2 h-8 w-8 text-primary" />
                                <p className="font-medium">{t('features.authentic.title')}</p>
                                <p className="text-sm text-muted-foreground">{t('features.authentic.description')}</p>
                            </div>
                            <div className="text-center">
                                <QrCode className="mx-auto mb-2 h-8 w-8 text-primary" />
                                <p className="font-medium">{t('features.traceable.title')}</p>
                                <p className="text-sm text-muted-foreground">{t('features.traceable.description')}</p>
                            </div>
                            <div className="text-center">
                                <Globe className="mx-auto mb-2 h-8 w-8 text-primary" />
                                <p className="font-medium">{t('features.connected.title')}</p>
                                <p className="text-sm text-muted-foreground">{t('features.connected.description')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Hero Image */}
                    <div className="relative">
                        <div className="relative aspect-[4/3] md:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                            <Image
                                src="/media/artisan_w.jpg"
                                alt="Artisan at work"
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>

                        {/* Floating QR Code Card */}
                        <div className="absolute -bottom-6 -left-6 rounded-xl border bg-white p-4 shadow-lg">
                            <div className="flex items-center space-x-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                                    <QrCode className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{t('features.qrCard.title')}</p>
                                    <p className="text-xs text-muted-foreground">{t('features.qrCard.description')}</p>
                                </div>
                            </div>
                        </div>
                </div>
            </div>
        </section>
    )
}
