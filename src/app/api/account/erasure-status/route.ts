import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    const id = request.cookies.get('craft-erasure-receipt')?.value
    const receipt = id
        ? await prisma.erasureReceipt.findUnique({
              where: { id },
              select: { completedAt: true },
          })
        : null
    return NextResponse.json(
        { status: !receipt ? 'unavailable' : receipt.completedAt ? 'complete' : 'pending' },
        {
            headers: { 'Cache-Control': 'private, no-store' },
        },
    )
}
