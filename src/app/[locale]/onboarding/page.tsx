import { useTranslations as useInterfaceTranslations } from 'next-intl'
import { Link } from '@/i8n/navigation'
import { Container } from '@/components/layout/Container'
import { Hammer, ShoppingBag } from 'lucide-react'

export default function OnboardingPage() {
    const tui = useInterfaceTranslations('interface')

    return (
        <Container>
            <div className="mx-auto max-w-2xl py-16 text-center">
                <h1 className="mb-3 text-3xl font-bold tracking-tight">
                    {tui('welcomeToSustainableCrafting')}
                </h1>
                <p className="mb-12 text-muted-foreground">
                    {tui('tellUsABitAboutYourselfSoWeCan')}
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Link
                        href="/onboarding/artisan"
                        className="group flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                            <Hammer className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold">{tui('imAnArtisan')}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {tui('iCreateCraftsAndWantToRegisterAndAuthenticate')}
                            </p>
                        </div>
                    </Link>

                    <Link
                        href="/crafts"
                        className="group flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                            <ShoppingBag className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold">{tui('imABuyer')}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {tui('iWantToDiscoverAndVerifyTheAuthenticityOf')}
                            </p>
                        </div>
                    </Link>
                </div>

                <p className="mt-8 text-xs text-muted-foreground">
                    {tui('youCanAlwaysSetUpYourArtisanProfileLater')}
                </p>
            </div>
        </Container>
    )
}
