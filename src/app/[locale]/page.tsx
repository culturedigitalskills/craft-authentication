import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { Container } from '@/components/layout/Container';
import { TraditionSection } from '@/components/landing/TraditionSection'

export default function Home() {
    return (
        // Landing Page Container
        <Container className="max-w-7xl pt-20">
            <HeroSection />
            <HowItWorksSection />
            <TraditionSection />
        </Container>
    )
}
