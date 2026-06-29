import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'

const AutoRenewSchema = z.object({
    enabled: z.boolean(),
})

export async function POST(request: Request) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const userId = session!.user.id

    try {
        const body = await request.json()
        const result = AutoRenewSchema.safeParse(body)
        
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const { enabled } = result.data

        await prisma.user.update({
            where: { id: userId },
            data: { c2paAutoRenew: enabled },
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error toggling auto-renew:', error)
        return NextResponse.json({ error: 'Failed to update auto-renew preference' }, { status: 500 })
    }
}
