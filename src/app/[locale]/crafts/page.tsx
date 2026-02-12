import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function CraftsPage() {
    const session = await auth()
    if (!session) {
        redirect('/login')
    }

    return (
        <div className="px-4 py-16">
            <div className="mx-auto max-w-md">
                <h1 className="mb-8 text-4xl font-bold">Explore Crafts</h1>
                <p className="text-lg text-muted-foreground">
                    Welcome, {session.user?.name || session.user?.email}!
                    This page is under construction.
                </p>
            </div>
        </div>
    )
}
