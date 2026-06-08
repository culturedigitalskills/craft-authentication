import 'server-only'
import { readFileSync, existsSync } from 'fs'
import crypto from 'crypto'

let cachedRootKeys: { privateKey: string; certificate: string } | null = null

/**
 * Retrieves and validates the C2PA Root CA key and certificate.
 * Throws a descriptive error if files are missing, unreadable, or invalid.
 */
export function getC2PARootKeys() {
    if (cachedRootKeys) return cachedRootKeys

    const keyPath = process.env.C2PA_ROOT_KEY_PATH
    const certPath = process.env.C2PA_ROOT_CERT_PATH

    if (!keyPath) {
        throw new Error('C2PA_ROOT_KEY_PATH is not set in environment. Please add it to your env file and run: node scripts/generate-c2pa-root.mjs')
    }
    if (!certPath) {
        throw new Error('C2PA_ROOT_CERT_PATH is not set in environment. Please add it to your env file and run: node scripts/generate-c2pa-root.mjs')
    }

    if (!existsSync(keyPath)) {
        throw new Error(`C2PA Root CA Private Key file not found at: ${keyPath}. Please run "node scripts/generate-c2pa-root.mjs" to generate it.`)
    }
    if (!existsSync(certPath)) {
        throw new Error(`C2PA Root CA Certificate file not found at: ${certPath}. Please run "node scripts/generate-c2pa-root.mjs" to generate it.`)
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
