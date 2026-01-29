import { useTranslations } from 'next-intl'
import { CheckCircle } from 'lucide-react'
import Image from 'next/image'

export function TraditionSection() {
    const t = useTranslations('');

    return (
        <section className="py-16 px-4 bg-muted/30">
            <div className="max-w-6xl mx-auto">
                <div className="grid gap-12 md:grid-cols-2 items-center">
                    {/* Left Column - Image */}
                    <div className="relative aspect-video rounded-xl overflow-hidden shadow-xl order-2 md:order-1">
                        <Image
                            src="/media/scan.jpg"
                            alt="QR code scanning"
                            fill
                            className="object-cover"
                        />
                    </div>

                    {/* Right Column - Text */}
                    <div className="space-y-6 order-1 md:order-2">
                        <h2 className="sm:text-2xl font-bold tracking-tight">
                            {t('tradition.title')}
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            {t('tradition.description')}
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
