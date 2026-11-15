import { getLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from '@/i8n/navigation'
import { GenerationWorkspaceClient } from '@/components/generation/GenerationWorkspaceClient'

export default async function GenerationWorkspacePage() {
    const session = await auth()
    if (!session?.user) {
        return redirect({ href: '/login', locale: await getLocale() })
    }

    return (
        <div className="container mx-auto max-w-6xl px-4 py-10">
            <GenerationWorkspaceClient userId={session.user.id} />
        </div>
    )
}
