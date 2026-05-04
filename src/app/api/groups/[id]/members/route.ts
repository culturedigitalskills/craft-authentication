import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AddGroupMemberSchema } from '@/lib/validations/group'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireGroupAdmin } from '@/lib/auth-guard'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params

        const group = await prisma.group.findUnique({ where: { id } })
        if (!group) {
            return errorResponse('Group not found', 404)
        }

        const members = await prisma.artisanGroupMembership.findMany({
            where: { groupId: id, leftDate: null },
            include: {
                artisan: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        slug: true,
                        bio: true,
                    },
                },
            },
            orderBy: [
                { role: 'asc' },
                { joinedDate: 'asc' },
            ],
        })

        return NextResponse.json(members)
    } catch (error) {
        console.error('Error fetching group members:', error)
        return errorResponse('Failed to fetch group members', 500)
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params
    const { unauthorized } = await requireGroupAdmin(id)
    if (unauthorized) return unauthorized

    try {
        const group = await prisma.group.findUnique({ where: { id } })
        if (!group) {
            return errorResponse('Group not found', 404)
        }

        const body = await request.json()
        const validatedData = AddGroupMemberSchema.parse(body)

        // Verify artisan exists
        const artisan = await prisma.artisan.findUnique({
            where: { id: validatedData.artisanId },
        })
        if (!artisan) {
            return errorResponse('Artisan not found', 404)
        }

        // Check if already a member
        const existing = await prisma.artisanGroupMembership.findUnique({
            where: {
                artisanId_groupId: {
                    artisanId: validatedData.artisanId,
                    groupId: id,
                },
            },
        })
        if (existing && !existing.leftDate) {
            return errorResponse('Artisan is already a member of this group', 409)
        }

        // If they were a past member (have leftDate), update instead of creating
        if (existing) {
            const membership = await prisma.artisanGroupMembership.update({
                where: { id: existing.id },
                data: {
                    role: validatedData.role,
                    leftDate: null,
                    joinedDate: new Date(),
                },
                include: { artisan: { select: { id: true, firstName: true, lastName: true, slug: true } } },
            })
            return NextResponse.json(membership, { status: 201 })
        }

        const membership = await prisma.artisanGroupMembership.create({
            data: {
                artisanId: validatedData.artisanId,
                groupId: id,
                role: validatedData.role,
            },
            include: { artisan: { select: { id: true, firstName: true, lastName: true, slug: true } } },
        })

        return NextResponse.json(membership, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error adding group member:', error)
        return errorResponse('Failed to add group member', 500)
    }
}
