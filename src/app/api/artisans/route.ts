import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateArtisanSchema } from '@/lib/validations/artisan'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'

export async function POST(request: NextRequest) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const body = await request.json()
        const validatedData = CreateArtisanSchema.parse(body)

        const existing = await prisma.artisan.findUnique({
            where: { userId: session!.user.id },
        })
        if (existing) {
            return errorResponse('Artisan profile already exists', 409)
        }

        const baseSlug = `${validatedData.firstName}-${validatedData.lastName}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')

        let slug = baseSlug
        let slugExists = await prisma.artisan.findUnique({ where: { slug } })
        let counter = 1
        while (slugExists) {
            slug = `${baseSlug}-${counter}`
            slugExists = await prisma.artisan.findUnique({ where: { slug } })
            counter++
        }

        const artisan = await prisma.artisan.create({
            data: {
                userId: session!.user.id,
                firstName: validatedData.firstName,
                lastName: validatedData.lastName,
                bio: validatedData.bio,
                yearsOfExperience: validatedData.yearsOfExperience,
                learningSource: validatedData.learningSource,
                country: validatedData.country,
                region: validatedData.region,
                slug,
            },
        })

        return NextResponse.json(artisan, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error creating artisan profile:', error)
        return errorResponse('Failed to create artisan profile', 500)
    }
}
