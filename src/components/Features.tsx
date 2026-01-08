import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Camera, Globe, Award } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ImageWithFallback } from '@/components/imageWithFallback';

export function Features() {
  const t = useTranslations();
  return (
   <section className="py-20">
  {/* section on front page with steps */}
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">{t('home.howItWorks.title')}</h2>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            {t('home.howItWorks.description')}
          </p>
        </div>

        <div className="mb-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 text-center shadow-sm">
            <CardHeader>
              <Camera className="mx-auto mb-4 h-12 w-12 text-primary" />
              <CardTitle>{t('home.howItWorks.steps.upload.title')}</CardTitle>
              <CardDescription>{t('home.howItWorks.steps.upload.description')}</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 text-center shadow-sm">
            <CardHeader>
              <Award className="mx-auto mb-4 h-12 w-12 text-primary" />
              <CardTitle>{t('home.howItWorks.steps.generate.title')}</CardTitle>
              <CardDescription>
                {t('home.howItWorks.steps.generate.description')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 text-center shadow-sm">
            <CardHeader>
              <Smartphone className="mx-auto mb-4 h-12 w-12 text-primary" />
              <CardTitle>{t('home.howItWorks.steps.scan.title')}</CardTitle>
              <CardDescription>
                {t('home.howItWorks.steps.scan.description')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 text-center shadow-sm">
            <CardHeader>
              <Globe className="mx-auto mb-4 h-12 w-12 text-primary" />
              <CardTitle>{t('home.howItWorks.steps.trust.title')}</CardTitle>
              <CardDescription>{t('home.howItWorks.steps.trust.description')}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h3 className="mb-6 text-2xl font-bold">{t('home.technology.title')}</h3>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              {t('home.technology.description')}
            </p>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="mt-2 h-2 w-2 rounded-full bg-primary"></div>
                <p>{t('home.technology.benefits.certificates')}</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="mt-2 h-2 w-2 rounded-full bg-primary"></div>
                <p>{t('home.technology.benefits.connection')}</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="mt-2 h-2 w-2 rounded-full bg-primary"></div>
                <p>{t('home.technology.benefits.transparency')}</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <ImageWithFallback
              src="/media/scan.jpg"
              alt={t('home.technology.imageAlt')}
              className="h-[400px] w-full rounded-xl object-cover shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
