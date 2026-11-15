import { getLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from '@/i8n/navigation'
import { prisma } from '@/lib/prisma'
import { ContentCredentialsClient } from './ContentCredentialsClient'

export default async function ContentCredentialsPage() {
    const session = await auth()
    if (!session?.user) {
        return redirect({ href: '/login', locale: await getLocale() })
    }

    // Pass the userId to the client component
    return (
        <div className="container mx-auto max-w-6xl px-4 py-10">
            <ContentCredentialsClient userId={session.user.id} />
        </div>
    )
}
