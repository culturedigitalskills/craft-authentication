import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { ArtisanProfileForm } from '@/components/profile/ArtisanProfileForm'

export default async function ProfilePage() {
    const session = await auth()
    if (!session?.user) {
        redirect('/login')
    }

    const artisan = await prisma.artisan.findUnique({
        where: { userId: session.user.id },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            bio: true,
            yearsOfExperience: true,
            learningSource: true,
        },
    })

    return (
        <Container>
            <ArtisanProfileForm artisan={artisan} />
        </Container>
    )
}
