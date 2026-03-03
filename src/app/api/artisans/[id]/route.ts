import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateArtisanSchema } from '@/lib/validations/artisan'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'

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
        if (artisan.userId !== session!.user.id) {
            return errorResponse('Unauthorized', 403)
        }

        const updateData: Record<string, unknown> = { ...validatedData }

        if (validatedData.firstName || validatedData.lastName) {
            const newFirst = validatedData.firstName ?? artisan.firstName
            const newLast = validatedData.lastName ?? artisan.lastName
            const baseSlug = `${newFirst}-${newLast}`
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')

            let slug = baseSlug
            let slugExists = await prisma.artisan.findFirst({
                where: { slug, id: { not: id } },
            })
            let counter = 1
            while (slugExists) {
                slug = `${baseSlug}-${counter}`
                slugExists = await prisma.artisan.findFirst({
                    where: { slug, id: { not: id } },
                })
                counter++
            }
            updateData.slug = slug
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
