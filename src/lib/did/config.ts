import crypto from 'crypto'

export const DOMAIN = process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://www.sustainablecrafting.org'
export const DID_WEB = `did:web:${DOMAIN.replace(/^https?:\/\//, '')}`

export function getPrivateKey(): string {
    const raw = process.env.VC_PRIVATE_KEY
    if (!raw) throw new Error('VC_PRIVATE_KEY env var is not set')
    return raw.replace(/\\n/g, '\n')
}

export function getPublicKey(): string {
    const raw = process.env.VC_PUBLIC_KEY
    if (!raw) throw new Error('VC_PUBLIC_KEY env var is not set')
    return raw.replace(/\\n/g, '\n')
}

export function getDIDDocument() {
    return {
        '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/v2'],
        id: DID_WEB,
        verificationMethod: [
            {
                id: `${DID_WEB}#key-1`,
                type: 'RsaVerificationKey2018',
                controller: DID_WEB,
                publicKeyPem: getPublicKey(),
            },
        ],
        authentication: [`${DID_WEB}#key-1`],
        assertionMethod: [`${DID_WEB}#key-1`],
        service: [
            {
                id: `${DID_WEB}#sustainable-crafting-registry`,
                type: 'SustainableCraftingRegistry',
                serviceEndpoint: `${DOMAIN}/api/vc`,
            },
        ],
    }
}
