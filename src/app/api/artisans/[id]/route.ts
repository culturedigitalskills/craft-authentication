import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateArtisanSchema, DeleteArtisanSchema } from '@/lib/validations/artisan'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'
import { generateUniqueSlug, rollSlugHistory } from '@/lib/slug'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const { id } = await params
        const body = await request.json()
        const validatedData = UpdateArtisanSchema.parse(body)

        const artisan = await prisma.artisan.findUnique({ where: { id } })
        if (!artisan) {
            return errorResponse('Artisan profile not found', 404)
        }
        if (artisan.userId !== session!.user.id && session!.user.role !== 'ADMIN') {
            return errorResponse('Unauthorized', 403)
        }

        const updateData: Record<string, unknown> = { ...validatedData }

        if (validatedData.firstName || validatedData.lastName) {
            const newFirst = validatedData.firstName ?? artisan.firstName
            const newLast = validatedData.lastName ?? artisan.lastName
            const slug = await generateUniqueSlug('artisan', `${newFirst}-${newLast}`, id)
            if (slug !== artisan.slug) {
                updateData.slug = slug
                // Keep the old slug alive so existing links/QR codes redirect.
                updateData.previousSlugs = rollSlugHistory(artisan.slug, slug, artisan.previousSlugs)
            }
        }

        const updated = await prisma.artisan.update({
            where: { id },
            data: updateData,
        })

        return NextResponse.json(updated)
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error updating artisan profile:', error)
        return errorResponse('Failed to update artisan profile', 500)
    }
}

/**
 * Remove an artisan profile, or restore one that was removed.
 *
 * This is a soft delete: it stamps `deletedAt` rather than dropping the row.
 * The column already gates every public artisan query, and `Artisan -> Craft`
 * cascades on a hard delete, so destroying the row would take the artisan's
 * crafts with it and invalidate the Verifiable Credentials and content
 * credentials issued against them. Those signed records are the point of the
 * platform, and a moderation decision must not be able to void them.
 *
 * Removal hides the artisan's crafts and their group memberships along with
 * the profile, via PUBLIC_CRAFT_WHERE and ACTIVE_MEMBERSHIP_WHERE, so nothing
 * public is left pointing at a profile that no longer resolves.
 *
 * Restoring is admin only. An artisan who removed themselves can no longer act
 * on the profile, and there is no database access in this deployment to undo a
 * mistake by hand, so an admin has to be able to put one back.
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const { id } = await params
        const { restore } = DeleteArtisanSchema.parse(
            await request.json().catch(() => ({})),
        )

        const artisan = await prisma.artisan.findUnique({
            where: { id },
            select: { id: true, userId: true, deletedAt: true },
        })
        if (!artisan) return errorResponse('Artisan profile not found', 404)

        const isAdmin = session!.user.role === 'ADMIN'
        const isOwner = artisan.userId === session!.user.id

        if (restore && !isAdmin) return errorResponse('Forbidden', 403)
        if (!restore && !isOwner && !isAdmin) return errorResponse('Forbidden', 403)

        // Idempotent: asking for the state a profile is already in is not an
        // error, so a repeated request or a double submit is harmless.
        if (Boolean(artisan.deletedAt) === !restore) {
            return NextResponse.json({ id: artisan.id, deletedAt: artisan.deletedAt })
        }

        const updated = await prisma.artisan.update({
            where: { id },
            data: { deletedAt: restore ? null : new Date() },
            select: { id: true, deletedAt: true },
        })

        return NextResponse.json(updated)
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Error removing artisan profile:', error)
        return errorResponse('Failed to remove artisan profile', 500)
    }
}
