import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { HealthResponseSchema } from '@/lib/validations/health'

export const dynamic = 'force-dynamic'

export async function GET() {
    const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
    try {
        await prisma.$queryRaw`SELECT 1`
        return NextResponse.json(HealthResponseSchema.parse({ status: 'healthy' }), { headers })
    } catch {
        return NextResponse.json(HealthResponseSchema.parse({ status: 'unavailable' }), {
            status: 503,
            headers,
        })
    }
}
