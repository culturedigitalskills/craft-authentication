import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dataQuerySchema, createDataRecordSchema } from '@/lib/validations/data'
import { handleValidationError, errorResponse } from '@/lib/validations/types'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'
import { generateCraftVC } from '@/lib/did/vc'
import { DOMAIN } from '@/lib/did/config'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const queryParams = dataQuerySchema.parse(Object.fromEntries(searchParams))

        const { page, limit, search } = queryParams

        const skip = (page - 1) * limit

        const where = search
            ? {
                  OR: [
                      { name: { contains: search, mode: 'insensitive' as const } },
                      { description: { contains: search, mode: 'insensitive' as const } },
                  ],
              }
            : {}

        const [data, totalCount] = await Promise.all([
            prisma.dataRecord.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.dataRecord.count({ where }),
        ])

        const totalPages = Math.ceil(totalCount / limit)

        return NextResponse.json({
            data,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error fetching data records:', error)
        return errorResponse('Failed to fetch data records', 500)
    }
}

export async function POST(request: NextRequest) {
    const { unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const body = await request.json()
        const validatedData = createDataRecordSchema.parse(body)
        const { name, description, data } = validatedData

        const record = await prisma.dataRecord.create({
            data: {
                name,
                description,
                data,
            },
        })

        // Issue a Verifiable Credential for the new craft (non-fatal)
        try {
            const craftData = record.data as Record<string, unknown>
            const artisanEmail = (craftData['artisan'] as string) ?? ''
            const firstMediaId = (craftData['mediaIds'] as string[] | undefined)?.[0] ?? null
            const firstImageUrl = firstMediaId
                ? `${process.env.AUTH_URL}/api/media/${firstMediaId}`
                : null

            const vc = await generateCraftVC(
                record.id,
                record.name,
                record.description ?? '',
                artisanEmail,
                record.createdAt.toISOString(),
                firstImageUrl,
            )

            const credentialId = `${DOMAIN}/credentials/crafts/${record.id}`
            await prisma.verifiableCredential.upsert({
                where: { credentialId },
                create: {
                    credentialId,
                    issuerDid: vc.issuer.id,
                    holderDid: artisanEmail,
                    credentialType: 'CraftCredential',
                    credentialSubject: vc.credentialSubject as object,
                    proof: vc.proof as object,
                    issuanceDate: new Date(vc.validFrom),
                },
                update: {
                    credentialSubject: vc.credentialSubject as object,
                    proof: vc.proof as object,
                    issuanceDate: new Date(vc.validFrom),
                },
            })
        } catch (vcError) {
            console.error('VC issuance failed for craft', record.id, vcError)
        }

        return NextResponse.json(record, { status: 201 })
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error)
        }
        console.error('Error creating data record:', error)
        return errorResponse('Failed to create data record', 500)
    }
}
