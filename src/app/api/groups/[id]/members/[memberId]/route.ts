import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateGroupMemberSchema } from '@/lib/validations/group'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireGroupAdmin } from '@/lib/auth-guard'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> },
) {
    const { id, memberId } = await params
    const { unauthorized } = await requireGroupAdmin(id)
    if (unauthorized) return unauthorized

    try {
        const membership = await prisma.artisanGroupMembership.findFirst({
            where: { id: memberId, groupId: id },
        })
        if (!membership) {
            return errorResponse('Membership not found', 404)
        }

        const body = await request.json()
        const validatedData = UpdateGroupMemberSchema.parse(body)

        const updated = await prisma.artisanGroupMembership.update({
            where: { id: memberId },
            data: { role: validatedData.role },
            include: { artisan: { select: { id: true, firstName: true, lastName: true, slug: true } } },
        })

        return NextResponse.json(updated)
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error updating group member:', error)
        return errorResponse('Failed to update group member', 500)
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> },
) {
    const { id, memberId } = await params
    const { unauthorized } = await requireGroupAdmin(id)
    if (unauthorized) return unauthorized

    try {
        const membership = await prisma.artisanGroupMembership.findFirst({
            where: { id: memberId, groupId: id, leftDate: null },
        })
        if (!membership) {
            return errorResponse('Membership not found', 404)
        }

        // Soft-delete: set leftDate instead of removing the record
        await prisma.artisanGroupMembership.update({
            where: { id: memberId },
            data: { leftDate: new Date() },
        })

        return NextResponse.json({ message: 'Member removed from group' })
    } catch (error) {
        console.error('Error removing group member:', error)
        return errorResponse('Failed to remove group member', 500)
    }
}
