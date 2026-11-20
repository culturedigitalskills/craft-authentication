import { getLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from '@/i8n/navigation'
import { GroupCreateForm } from '@/components/groups/GroupCreateForm'

export default async function CreateGroupPage() {
    const session = await auth()
    if (!session?.user) return redirect({ href: '/login', locale: await getLocale() })
    if (session.user.role !== 'ADMIN')
        return redirect({ href: '/groups', locale: await getLocale() })

    return (
        <div className="container mx-auto px-4 py-10">
            <GroupCreateForm />
        </div>
    )
}
