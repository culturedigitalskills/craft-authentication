import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateGroupSchema } from '@/lib/validations/group'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireGroupAdmin } from '@/lib/auth-guard'
import { generateUniqueSlug, rollSlugHistory } from '@/lib/slug'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params

        // Support lookup by slug or UUID
        const group = await prisma.group.findFirst({
            where: {
                OR: [{ id }, { slug: id }],
            },
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
                                bio: true,
                            },
                        },
                    },
                    orderBy: [
                        { role: 'asc' },
                        { joinedDate: 'asc' },
                    ],
                },
                _count: { select: { memberships: true } },
            },
        })

        if (!group) {
            return errorResponse('Group not found', 404)
        }

        return NextResponse.json(group)
    } catch (error) {
        console.error('Error fetching group:', error)
        return errorResponse('Failed to fetch group', 500)
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params
    const { unauthorized } = await requireGroupAdmin(id)
    if (unauthorized) return unauthorized

    try {
        const body = await request.json()
        const validatedData = UpdateGroupSchema.parse(body)

        const group = await prisma.group.findUnique({ where: { id } })
        if (!group) {
            return errorResponse('Group not found', 404)
        }

        const updateData: Record<string, unknown> = { ...validatedData }

        // Handle empty website string as null
        if (validatedData.website === '') {
            updateData.website = null
        }

        // Regenerate slug if name changes, retiring the old slug into history
        // so existing links/QR codes keep resolving via a redirect.
        if (validatedData.name) {
            const slug = await generateUniqueSlug('group', validatedData.name, id)
            if (slug !== group.slug) {
                updateData.slug = slug
                updateData.previousSlugs = rollSlugHistory(group.slug, slug, group.previousSlugs)
            }
        }

        const updated = await prisma.group.update({
            where: { id },
            data: updateData,
        })

        return NextResponse.json(updated)
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error updating group:', error)
        return errorResponse('Failed to update group', 500)
    }
}

export async function DELETE(
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

        await prisma.group.delete({ where: { id } })

        return NextResponse.json({ message: 'Group deleted successfully' })
    } catch (error) {
        console.error('Error deleting group:', error)
        return errorResponse('Failed to delete group', 500)
    }
}
