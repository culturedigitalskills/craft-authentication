import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ContentCredentialsClient } from './ContentCredentialsClient'

export default async function ContentCredentialsPage() {
    const session = await auth()
    if (!session?.user) {
        redirect('/login')
    }

    // Pass the userId to the client component
    return (
        <div className="container max-w-7xl mx-auto px-4 py-24">
            <ContentCredentialsClient userId={session.user.id} />
        </div>
    )
}
