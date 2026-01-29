import { Container } from '@/components/Container';
import { useTranslations } from 'next-intl'
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ContentPage(
) {
    const t = useTranslations();
      return (
    <Container>
    <h1 className="mb-4 text-4xl font-bold">
      {t('about.missionTitle')}
    </h1> 
    <h2 className="mb-8 text-lg leading-relaxed text-muted-foreground">
      {t('about.missionDescription')}
    </h2> 
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" asChild>
          <Link href="https://github.com/karina-rodriguez/craft-authentication">
              {t('about.viewRepository')}
          </Link>
      </Button>
    <p className="mb-8 text-lg leading-relaxed text-muted-foreground">{t('about.keyFeatures')}</p>

    </div>
    </Container>
    
    )
  }
