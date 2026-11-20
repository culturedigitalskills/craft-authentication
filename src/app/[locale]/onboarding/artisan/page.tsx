import { getLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from '@/i8n/navigation'
import { ArtisanOnboardingWizard } from '@/components/onboarding/ArtisanOnboardingWizard'

export default async function OnboardingArtisanPage() {
    const session = await auth()
    if (!session?.user) return redirect({ href: '/login', locale: await getLocale() })

    const existing = await prisma.artisan.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    })
    if (existing) return redirect({ href: '/profile', locale: await getLocale() })

    return <ArtisanOnboardingWizard />
}
