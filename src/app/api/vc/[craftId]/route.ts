import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DOMAIN } from '@/lib/did/config'
import { errorResponse } from '@/lib/validations/types'
import type { CraftCredential } from '@/lib/did/vc'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ craftId: string }> },
) {
    try {
        const { craftId } = await params
        const credentialId = `${DOMAIN}/credentials/crafts/${craftId}`

        const vcRecord = await prisma.verifiableCredential.findUnique({
            where: { credentialId },
        })

        if (!vcRecord) {
            return errorResponse('Credential not found', 404)
        }

        const proof = vcRecord.proof as CraftCredential['proof']

        const credential = {
            '@context': [
                'https://www.w3.org/ns/credentials/v2',
                'https://w3id.org/security/v2',
                {
                    Craft: 'https://schema.org/Product',
                    title: 'https://schema.org/name',
                    description: 'https://schema.org/description',
                    ownerId: 'https://schema.org/manufacturer',
                    dateCreated: 'https://schema.org/dateCreated',
                    imageUrl: 'https://schema.org/image',
                    imageHash: 'https://schema.org/contentHash',
                },
            ],
            id: credentialId,
            type: ['VerifiableCredential', 'CraftCredential'],
            issuer: {
                id: vcRecord.issuerDid,
                name: 'Sustainable Crafting Registry',
            },
            credentialSubject: vcRecord.credentialSubject,
            validFrom: proof.created,
            proof,
        }

        return NextResponse.json(credential, {
            headers: {
                'Content-Disposition': `attachment; filename="credential-${craftId}.json"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        console.error('Error serving VC:', error)
        return errorResponse('Failed to retrieve credential', 500)
    }
}
