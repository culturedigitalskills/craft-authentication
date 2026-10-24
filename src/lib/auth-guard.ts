import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { redirect, notFound } from 'next/navigation'

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

/**
 * Auth, plus the caller's artisan profile, refusing a profile that has been
 * removed.
 *
 * Removal hides an artisan from the public site. Without this they stayed
 * signed in and kept writing: creating crafts, editing the story, renaming the
 * profile (which retires the slug printed on their QR codes) and uploading
 * media, all of it into rows the platform has committed to hiding. A moderation
 * decision has to reach the writes as well as the reads.
 *
 * Site admins are exempt so they can still act on a removed artisan's content.
 * Returns artisan: null when the caller has no profile yet, which is the
 * onboarding case and not an error here; callers that need one say so.
 */
export async function requireActiveArtisan() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return { session: null, artisan: null, unauthorized }

    const artisan = await prisma.artisan.findUnique({
        where: { userId: session!.user.id },
        select: { id: true, deletedAt: true },
    })

    if (artisan?.deletedAt && session!.user.role !== 'ADMIN') {
        return {
            session,
            artisan: null,
            unauthorized: NextResponse.json(
                {
                    error: 'PROFILE_REMOVED',
                    message: 'This profile has been removed and can no longer be changed.',
                },
                { status: 403 },
            ),
        }
    }

    return { session, artisan, unauthorized: null }
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

/**
 * The page equivalent of requireAdmin, for server components.
 *
 * requireAdmin answers with a NextResponse, which a page cannot return, so
 * every admin page would otherwise repeat its own inline role check and one
 * missed line is an open door. Redirects rather than showing a 403: an admin
 * area should not confirm to a logged-in artisan that it is there.
 */
export async function requireAdminSession() {
    const session = await auth()
    if (!session?.user) redirect('/login')
    if (session.user.role !== 'ADMIN') notFound()
    return session
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
