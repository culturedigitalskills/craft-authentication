import { HeroSection } from '@/components/landing/HeroSection'
import { QRTechnologySection } from '@/components/landing/QRTechnologySection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { TraditionSection } from '@/components/landing/TraditionSection'

export default function Home() {
    return (
        <>
            <HeroSection />
            <QRTechnologySection />
            <HowItWorksSection />
            <TraditionSection />
        </>
    )
}
