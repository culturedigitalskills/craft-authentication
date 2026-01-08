import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { Hero } from '@/components/Hero';
import { Container } from '@/components/Container';
import { Features } from '@/components/Features';

export default function Home() {
    const t = useTranslations('Home');
    return (
    <Container>
      <Hero />
      <Features />
      {/* <Gallery /> */}
    </Container>
    
    )
}
