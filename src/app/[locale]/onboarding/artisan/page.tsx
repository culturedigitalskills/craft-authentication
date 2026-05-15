import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ArtisanOnboardingWizard } from '@/components/onboarding/ArtisanOnboardingWizard'

export default async function OnboardingArtisanPage() {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const existing = await prisma.artisan.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    })
    if (existing) redirect('/profile')

    return <ArtisanOnboardingWizard />
}
