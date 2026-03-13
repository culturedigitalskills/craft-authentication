import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function AuthRedirectPage() {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const artisan = await prisma.artisan.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    })

    if (artisan) {
        redirect('/crafts')
    } else {
        redirect('/profile')
    }
}
