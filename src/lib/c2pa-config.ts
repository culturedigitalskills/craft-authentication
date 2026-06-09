import 'server-only'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'

let cachedRootKeys: { privateKey: string; certificate: string } | null = null
let cachedTrustList: string | null | undefined = undefined // undefined = not yet attempted

/**
 * Retrieves and validates the C2PA Root CA key and certificate.
 * Throws a descriptive error if files are missing, unreadable, or invalid.
 */
export function getC2PARootKeys() {
    if (cachedRootKeys) return cachedRootKeys

    const keyPath = process.env.C2PA_ROOT_KEY_PATH
    const certPath = process.env.C2PA_ROOT_CERT_PATH

    if (!keyPath) {
        throw new Error(
            'C2PA_ROOT_KEY_PATH is not set in environment. Please add it to your env file and run: node scripts/generate-c2pa-root.mjs',
        )
    }
    if (!certPath) {
        throw new Error(
            'C2PA_ROOT_CERT_PATH is not set in environment. Please add it to your env file and run: node scripts/generate-c2pa-root.mjs',
        )
    }

    if (!existsSync(keyPath)) {
        throw new Error(
            `C2PA Root CA Private Key file not found at: ${keyPath}. Please run "node scripts/generate-c2pa-root.mjs" to generate it.`,
        )
    }
    if (!existsSync(certPath)) {
        throw new Error(
            `C2PA Root CA Certificate file not found at: ${certPath}. Please run "node scripts/generate-c2pa-root.mjs" to generate it.`,
        )
    }

    let privateKey: string
    let certificate: string

    try {
        privateKey = readFileSync(keyPath, 'utf8')
    } catch {
        throw new Error(`C2PA Root CA private key file is unreadable at: ${keyPath}`)
    }

    try {
        certificate = readFileSync(certPath, 'utf8')
    } catch {
        throw new Error(`C2PA Root CA certificate file is unreadable at: ${certPath}`)
    }

    try {
        crypto.createPrivateKey(privateKey)
    } catch {
        throw new Error(`Invalid EC private key at C2PA_ROOT_KEY_PATH: ${keyPath}`)
    }

    // Cache the loaded keys
    cachedRootKeys = { privateKey, certificate }
    return cachedRootKeys
}

/**
 * Loads the C2PA content-signing trust list PEM from secrets/c2pa-trust-list.pem.
 * Returns null and logs an error if the file is missing — callers should fall back
 * to validating with only the local CA cert in that case.
 *
 * Run "node scripts/download-c2pa-trust-list.mjs" to populate the file.
 */
export function getC2PATrustList(): string | null {
    if (cachedTrustList !== undefined) return cachedTrustList

    const trustListPath = process.env.C2PA_TRUST_LIST_PATH
    if (!trustListPath) {
        throw new Error(
            'C2PA_TRUST_LIST_PATH is not set in environment. Please add it to your env file and run: node scripts/download-c2pa-trust-list.mjs',
        )
    }

    if (!existsSync(trustListPath)) {
        throw new Error(
            `C2PA Trust List file not found at: ${trustListPath}. Please run "node scripts/download-c2pa-trust-list.mjs" to generate it.`,
        )
    }

    if (!existsSync(trustListPath)) {
        console.error(
            '[C2PA] WARNING: C2PA trust list not found at ' +
                trustListPath +
                '. ' +
                'Third-party C2PA signatures (e.g. Google, Adobe) will be marked as untrusted. ' +
                'Run "node scripts/download-c2pa-trust-list.mjs" to fix this.',
        )
        cachedTrustList = null
        return null
    }

    try {
        cachedTrustList = readFileSync(trustListPath, 'utf8')
        return cachedTrustList
    } catch {
        console.error('[C2PA] ERROR: Could not read C2PA trust list at ' + trustListPath)
        cachedTrustList = null
        return null
    }
}
