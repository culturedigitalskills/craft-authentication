import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Hammer, ShoppingBag } from 'lucide-react'

export default function OnboardingPage() {
    return (
        <Container>
            <div className="mx-auto max-w-2xl py-16 text-center">
                <h1 className="mb-3 text-3xl font-bold tracking-tight">Welcome to Sustainable Crafting</h1>
                <p className="mb-12 text-muted-foreground">
                    Tell us a bit about yourself so we can tailor your experience.
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
                            <p className="text-lg font-semibold">I&apos;m an Artisan</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                I create crafts and want to register and authenticate my work.
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
                            <p className="text-lg font-semibold">I&apos;m a Buyer</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                I want to discover and verify the authenticity of crafts.
                            </p>
                        </div>
                    </Link>
                </div>

                <p className="mt-8 text-xs text-muted-foreground">
                    You can always set up your artisan profile later from your account settings.
</p>
            </div>
        </Container>
    )
}
