import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { Container } from '@/components/layout/Container';
import { TraditionSection } from '@/components/landing/TraditionSection'

export default function Home() {
    return (
        // Landing Page Container
        <Container>
            <HeroSection />
            <HowItWorksSection />
            <TraditionSection />
        </Container>
    )
}
