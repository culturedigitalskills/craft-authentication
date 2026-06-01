import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader'
import { useTranslations } from 'next-intl'
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ContentPage(
) {
    const t = useTranslations();
      return (
    <Container>
      <PageHeader title={t('about.missionTitle')} description={t('about.missionDescription')} />

      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-8 text-lg leading-relaxed text-muted-foreground">{t('about.keyFeatures')}</p>

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="https://github.com/karina-rodriguez/craft-authentication">
              {t('about.viewRepository')}
            </Link>
          </Button>
        </div>
      </div>
    </Container>
    )
  }
