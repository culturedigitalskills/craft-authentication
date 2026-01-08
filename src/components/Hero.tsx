import { Button } from '@/components/ui/button';
import Link from 'next/link';
// import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl'
import { Shield, QrCode, Users } from 'lucide-react';
import { ImageWithFallback } from '@/components/imageWithFallback';

export function Hero() {
  const t = useTranslations();
  // let params = useParams();
  
  

  {/* FRONT PAGE code, this creates a two column area */}
  return (
    <section className="bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            {/* First column */}
            <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
              {t('home.hero.title')}
            </h1>
            <h2 className="mb-6 text-4xl font-bold leading-tight md:text-3xl">
              <span className="block text-primary">{t('home.hero.titleHighlight')}</span>
            </h2>  
            <p className="mb-8 text-xl leading-relaxed text-muted-foreground">{t('home.hero.description')}</p>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="px-8" asChild>
                <Link href='#'>{t('home.hero.exploreCraftsButton')}</Link>
              </Button>
              <Button variant="outline" size="lg" className="px-8">
                <Link href={`https://craftingsustainablejawaja.org/`} target={`_blank`}>{t('home.hero.learnMoreButton')}</Link>
              </Button>
            </div>

            {/* three icons below the description */}
            <div className="grid grid-cols-3 gap-8 border-t pt-8">
              <div className="text-center">
                <Shield className="mx-auto mb-2 h-8 w-8 text-primary" />
                <p className="font-medium">{t('home.hero.features.verified.title')}</p>
                <p className="text-sm text-muted-foreground">{t('home.hero.features.verified.description')}</p>
              </div>
              <div className="text-center">
                <QrCode className="mx-auto mb-2 h-8 w-8 text-primary" />
                <p className="font-medium">{t('home.hero.features.traceable.title')}</p>
                <p className="text-sm text-muted-foreground">{t('home.hero.features.traceable.description')}</p>
              </div>
              <div className="text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-primary" />
                <p className="font-medium">{t('home.hero.features.direct.title')}</p>
                <p className="text-sm text-muted-foreground">{t('home.hero.features.direct.description')}</p>
              </div>
            </div>
          </div>

            {/* image has been replaced with Jawaja woman */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
            
              <ImageWithFallback
              src="/media/artisan_w.jpg"
              alt={t('home.technology.imageAlt')}
              className="h-[400px] w-full rounded-xl object-cover shadow-lg"
            />
              {/* <ImageWithFallback
                src="https://images.unsplash.com/photo-1599302994569-6fd86e9529e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjB0ZXh0aWxlJTIwd2VhdmluZyUyMGFydGlzYW58ZW58MXx8fHwxNzU0NTc5NzQ2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt={t('home.hero.imageAlt')}
                className="h-[500px] w-full object-cover"
              /> */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>

            {/* Floating QR Code Card */}
            <div className="absolute -bottom-6 -left-6 rounded-xl border bg-white p-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t('home.hero.qrCard.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('home.hero.qrCard.description')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
