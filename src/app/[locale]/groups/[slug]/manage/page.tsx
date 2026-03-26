import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { GroupManageForm } from '@/components/groups/GroupManageForm'

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function GroupManagePage({ params }: PageProps) {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const { slug } = await params
    const group = await prisma.group.findUnique({
        where: { slug },
        include: {
            memberships: {
                where: { leftDate: null },
                include: {
                    artisan: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            slug: true,
                        },
                    },
                },
                orderBy: [
                    { role: 'asc' },
                    { joinedDate: 'asc' },
                ],
            },
        },
    })

    if (!group) notFound()

    // Check authorization: site admin or group admin
    const isAdmin = session.user.role === 'ADMIN'
    let isGroupAdmin = false

    if (!isAdmin) {
        const artisan = await prisma.artisan.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        })
        if (artisan) {
            const membership = group.memberships.find(
                m => m.artisanId === artisan.id && m.role === 'ADMIN'
            )
            isGroupAdmin = !!membership
        }
    }

    if (!isAdmin && !isGroupAdmin) redirect(`/groups/${slug}`)

    const members = group.memberships.map(m => ({
        id: m.id,
        role: m.role,
        artisan: m.artisan,
    }))

    return (
        <div className="container mx-auto max-w-6xl px-4 py-10">
            <GroupManageForm
                group={{
                    id: group.id,
                    name: group.name,
                    slug: group.slug,
                    description: group.description,
                    website: group.website,
                    location: group.location,
                    isWomenLed: group.isWomenLed,
                    isCooperative: group.isCooperative,
                    isFairTrade: group.isFairTrade,
                }}
                members={members}
            />
        </div>
    )
}
