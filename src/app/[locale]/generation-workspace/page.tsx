import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GenerationWorkspaceClient } from '@/components/generation/GenerationWorkspaceClient'

export default async function GenerationWorkspacePage() {
    const session = await auth()
    if (!session?.user) {
        redirect('/login')
    }

    return (
        <div className="container max-w-7xl mx-auto px-4 py-24">
            <GenerationWorkspaceClient userId={session.user.id} />
        </div>
    )
}
