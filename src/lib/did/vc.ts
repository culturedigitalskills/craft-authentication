import crypto from 'crypto'
import { getPrivateKey, getPublicKey, DOMAIN, DID_WEB } from './config'

export interface CraftVCSubject {
    id: string
    type: 'Craft'
    title: string
    description: string
    ownerId: string
    dateCreated: string
    imageUrl?: string
    imageHash?: string
}

export interface CraftCredential {
    '@context': (string | Record<string, string>)[]
    id?: string
    type: string[]
    issuer: {
        id: string
        name: string
    }
    credentialSubject: CraftVCSubject
    validFrom: string
    validUntil?: string
    proof: {
        type: string
        created: string
        verificationMethod: string
        proofPurpose: string
        signature: string
    }
}

// Canonical JSON: sorts object keys recursively so the output is stable
// regardless of insertion order or how Postgres JSONB returns keys.
function canonicalize(data: unknown): string {
    return JSON.stringify(data, (_, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value as object)
                .sort()
                .reduce((sorted: Record<string, unknown>, key) => {
                    sorted[key] = (value as Record<string, unknown>)[key]
                    return sorted
                }, {})
        }
        return value
    })
}

function signData(data: string, privateKey: string): string {
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(data)
    sign.end()
    return sign.sign(privateKey, 'base64')
}

export async function generateCraftVC(
    craftId: string,
    craftTitle: string,
    craftDescription: string,
    craftOwner: string,
    craftCreatedAt: string,
    firstImageUrl: string | null,
): Promise<CraftCredential> {
    const privateKey = getPrivateKey()

    const subjectId = `${DOMAIN}/credentials/crafts/${craftId}`

    let imageHash: string | undefined
    if (firstImageUrl) {
        imageHash = crypto.createHash('sha256').update(firstImageUrl).digest('hex')
    }

    const credentialSubject: CraftVCSubject = {
        id: subjectId,
        type: 'Craft',
        title: craftTitle,
        description: craftDescription,
        ownerId: craftOwner,
        dateCreated: craftCreatedAt,
        ...(firstImageUrl && { imageUrl: firstImageUrl }),
        ...(imageHash && { imageHash }),
    }

    const now = new Date().toISOString()

    const unsignedCredential = {
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
        type: ['VerifiableCredential', 'CraftCredential'],
        issuer: {
            id: DID_WEB,
            name: 'Sustainable Crafting Registry',
        },
        credentialSubject,
        validFrom: now,
    }

    const signature = signData(canonicalize(unsignedCredential), privateKey)

    return {
        ...unsignedCredential,
        proof: {
            type: 'RsaSignature2017',
            created: now,
            verificationMethod: `${DID_WEB}#key-1`,
            proofPurpose: 'assertionMethod',
            signature,
        },
    }
}

export async function verifyCraftVC(
    credentialSubject: object,
    proof: CraftCredential['proof'],
    issuerDid: string,
    validFrom: string,
): Promise<{ verified: boolean; error?: string }> {
    try {
        const publicKey = getPublicKey()

        // Reconstruct the exact same unsigned credential object that was signed
        const unsignedCredential = {
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
            type: ['VerifiableCredential', 'CraftCredential'],
            issuer: { id: issuerDid, name: 'Sustainable Crafting Registry' },
            credentialSubject,
            validFrom,
        }

        const verify = crypto.createVerify('RSA-SHA256')
        verify.update(canonicalize(unsignedCredential))
        verify.end()

        const isValid = verify.verify(publicKey, proof.signature, 'base64')
        if (!isValid) return { verified: false, error: 'Invalid signature' }

        if (issuerDid !== DID_WEB) return { verified: false, error: 'Invalid issuer' }

        return { verified: true }
    } catch (error) {
        return {
            verified: false,
            error: error instanceof Error ? error.message : 'Verification error',
        }
    }
}
