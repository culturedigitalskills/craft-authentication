import { useTranslations } from 'next-intl'
import { Camera, QrCode, Smartphone, Globe } from 'lucide-react'
import { StepCard } from './StepCard'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function HowItWorksSection() {
    const t = useTranslations('');

    return (
        <section className="py-16 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center space-y-4 mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('howItWorks.title')}</h2>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                        {t('howItWorks.subtitle')}
                    </p>
                </div>

                {/* Steps Grid */}
                <div className="mb-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4 ">

                    <Card className='bg-primary/10 rounded-md'>
                    <CardHeader>
                     <Camera className="mx-auto mb-4 h-12 w-12 text-primary " strokeWidth={2.5} />
                    <CardTitle>{t('howItWorks.steps.record.title')}</CardTitle>
                    <CardDescription>{t('howItWorks.steps.record.description')}</CardDescription>
                    </CardHeader>
                    </Card>

                    <Card className='bg-primary/10 rounded-md'>
                    <CardHeader>
                     <QrCode className="mx-auto mb-4 h-12 w-12 text-primary " strokeWidth={2.5} />
                    <CardTitle>{t('howItWorks.steps.generate.title')}</CardTitle>
                    <CardDescription>{t('howItWorks.steps.generate.description')}</CardDescription>
                    </CardHeader>
                    </Card>
                    
                    <Card className='bg-primary/10 rounded-md'>
                    <CardHeader>
                     <Smartphone className="mx-auto mb-4 h-12 w-12 text-primary " strokeWidth={2.5} />
                    <CardTitle>{t('howItWorks.steps.scan.title')}</CardTitle>
                    <CardDescription>{t('howItWorks.steps.scan.description')}</CardDescription>
                    </CardHeader>
                    </Card>

                    <Card className='bg-primary/10 rounded-md'>
                    <CardHeader>
                     <Globe className="mx-auto mb-4 h-12 w-12 text-primary " strokeWidth={2.5} />
                    <CardTitle>{t('howItWorks.steps.scan.title')}</CardTitle>
                    <CardDescription>{t('howItWorks.steps.scan.description')}</CardDescription>
                    </CardHeader>
                    </Card>
                
                </div>
            </div>
        </section>
    )
}
