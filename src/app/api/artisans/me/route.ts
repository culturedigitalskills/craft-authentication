import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { errorResponse } from '@/lib/validations/types'

export async function GET() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const artisan = await prisma.artisan.findUnique({
            where: { userId: session!.user.id },
        })

        return NextResponse.json({ artisan: artisan ?? null })
    } catch (error) {
        console.error('Error fetching artisan profile:', error)
        return errorResponse('Failed to fetch artisan profile', 500)
    }
}
