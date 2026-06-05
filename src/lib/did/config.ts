import crypto from 'crypto'
import 'server-only'
import { readFileSync } from 'fs'

export const DOMAIN = process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://www.sustainablecrafting.org'
export const DID_WEB = `did:web:${DOMAIN.replace(/^https?:\/\//, '')}`

let cachedPrivateKey: string | null = null
let cachedPublicKey: string | null = null

function normalizePem(value: string): string {
    return value.replace(/\\n/g, '\n')
}

function readKeyFromEnvOrFile(envName: string, pathEnvName: string): string {
    const fromPath = process.env[pathEnvName]
    if (fromPath) {
        try {
            return normalizePem(readFileSync(fromPath, 'utf8'))
        } catch {
            throw new Error(`${pathEnvName} is set but could not be read`)
        }
    }

    const raw = process.env[envName]
    if (raw) return normalizePem(raw)

    throw new Error(`${envName} or ${pathEnvName} must be set`)
}

export function getPrivateKey(): string {
    if (cachedPrivateKey) return cachedPrivateKey

    const key = readKeyFromEnvOrFile('VC_PRIVATE_KEY', 'VC_PRIVATE_KEY_PATH')
    try {
        crypto.createPrivateKey(key)
    } catch {
        throw new Error('Invalid private key format in VC_PRIVATE_KEY or VC_PRIVATE_KEY_PATH')
    }

    cachedPrivateKey = key
    return key
}

export function getPublicKey(): string {
    if (cachedPublicKey) return cachedPublicKey

    const key = readKeyFromEnvOrFile('VC_PUBLIC_KEY', 'VC_PUBLIC_KEY_PATH')
    try {
        crypto.createPublicKey(key)
    } catch {
        throw new Error('Invalid public key format in VC_PUBLIC_KEY or VC_PUBLIC_KEY_PATH')
    }

    cachedPublicKey = key
    return key
}

export function validateDidKeyConfig(): void {
    void getPrivateKey()
    void getPublicKey()
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
