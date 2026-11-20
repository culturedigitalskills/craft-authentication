import { getLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from '@/i8n/navigation'

export default async function AuthRedirectPage() {
    const session = await auth()
    if (!session?.user) return redirect({ href: '/login', locale: await getLocale() })

    const artisan = await prisma.artisan.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    })

    if (artisan) {
        return redirect({ href: '/crafts', locale: await getLocale() })
    } else {
        return redirect({ href: '/onboarding', locale: await getLocale() })
    }
}
