import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GroupCreateForm } from '@/components/groups/GroupCreateForm'

export default async function CreateGroupPage() {
    const session = await auth()
    if (!session?.user) redirect('/login')
    if (session.user.role !== 'ADMIN') redirect('/groups')

    return (
        <div className="container mx-auto px-4 py-10">
            <GroupCreateForm />
        </div>
    )
}
