import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function requireAuth() {
    const session = await auth()
    if (!session?.user) {
        return {
            session: null,
            unauthorized: NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            ),
        }
    }
    return { session, unauthorized: null }
}

export async function requireAdmin() {
    const session = await auth()
    if (!session?.user) {
        return {
            session: null,
            unauthorized: NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            ),
        }
    }
    if (session.user.role !== 'ADMIN') {
        return {
            session,
            unauthorized: NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            ),
        }
    }
    return { session, unauthorized: null }
}

export async function requireGroupAdmin(groupId: string) {
    const session = await auth()
    if (!session?.user) {
        return {
            session: null,
            unauthorized: NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            ),
        }
    }

    // Site admins can manage any group
    if (session.user.role === 'ADMIN') {
        return { session, unauthorized: null }
    }

    // Check if user is a group admin via their artisan profile
    const artisan = await prisma.artisan.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    })

    if (artisan) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Available after running prisma generate with the Group migration
        const membership = await (prisma as any).artisanGroupMembership.findUnique({
            where: {
                artisanId_groupId: {
                    artisanId: artisan.id,
                    groupId,
                },
            },
            select: { role: true },
        })

        if (membership?.role === 'ADMIN') {
            return { session, unauthorized: null }
        }
    }

    return {
        session,
        unauthorized: NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
        ),
    }
}
