import 'server-only'
import crypto from 'crypto'
import { readFileSync } from 'fs'

/**
 * KeyManagementService interface defines the contract for server-side
 * key wrapping and unwrapping operations.
 */
export interface KeyManagementService {
    getPublicWrappingKey(): string
    wrapMasterKey(asymmetricallyWrappedMasterKey: string): Promise<string>
    unwrapMasterKey(wrappedMasterKey: string): Promise<Uint8Array>
    /**
     * Decrypts a UTF-8 string (e.g. an API key) that the client RSA-OAEP-wrapped
     * with the KMS public key for a single request. Used by vault server functions
     * when the user operates in full E2E mode (no SSE_KMS row).
     */
    decryptRequestSecret(rsaWrappedValue: string): Promise<string>
}

let cachedKeyPair: { publicKey: string; privateKey: string } | null = null

function getKmsKeyPair() {
    if (cachedKeyPair) return cachedKeyPair

    const privateKeyPath = process.env.KMS_PRIVATE_KEY_PATH
    const publicKeyPath = process.env.KMS_PUBLIC_KEY_PATH

    if (!privateKeyPath) {
        throw new Error('KMS_PRIVATE_KEY_PATH is not set. Run: node scripts/generate-kms-keys.mjs')
    }
    if (!publicKeyPath) {
        throw new Error('KMS_PUBLIC_KEY_PATH is not set. Run: node scripts/generate-kms-keys.mjs')
    }

    let privateKey: string
    let publicKey: string

    try {
        privateKey = readFileSync(privateKeyPath, 'utf8')
    } catch {
        throw new Error(`KMS_PRIVATE_KEY_PATH points to an unreadable file: ${privateKeyPath}`)
    }

    try {
        publicKey = readFileSync(publicKeyPath, 'utf8')
    } catch {
        throw new Error(`KMS_PUBLIC_KEY_PATH points to an unreadable file: ${publicKeyPath}`)
    }

    try {
        crypto.createPrivateKey(privateKey)
    } catch {
        throw new Error(`Invalid RSA private key at KMS_PRIVATE_KEY_PATH: ${privateKeyPath}`)
    }
    try {
        crypto.createPublicKey(publicKey)
    } catch {
        throw new Error(`Invalid RSA public key at KMS_PUBLIC_KEY_PATH: ${publicKeyPath}`)
    }

    cachedKeyPair = { publicKey, privateKey }
    return cachedKeyPair
}

function getSymmetricKey(): Buffer {
    const envKey = process.env.LOCAL_MASTER_KEY
    if (!envKey) {
        throw new Error(
            'LOCAL_MASTER_KEY is not set. ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        )
    }
    if (envKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(envKey)) {
        throw new Error('LOCAL_MASTER_KEY must be a 64-character hex string (32 bytes / 256 bits)')
    }
    return Buffer.from(envKey, 'hex')
}

/**
 * MockLocalKMS implements the KeyManagementService for local development.
 *
 * ============================================================================
 * WARNING: This class is strictly for local development and must never be
 * deployed to production. A real KMS (such as OpenBao, HashiCorp Vault,
 * Scaleway Key Manager, or OVHcloud KMS) is required in all production-like
 * environments to guarantee the security of wrapped keys.
 * ============================================================================
 */
class MockLocalKMS implements KeyManagementService {
    getPublicWrappingKey(): string {
        return getKmsKeyPair().publicKey
    }

    async wrapMasterKey(asymmetricallyWrappedMasterKey: string): Promise<string> {
        // 1. RSA-OAEP-decrypt the client-wrapped MasterVaultKey
        const rawMasterKey = crypto.privateDecrypt(
            {
                key: getKmsKeyPair().privateKey,
                oaepHash: 'sha256',
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            Buffer.from(asymmetricallyWrappedMasterKey, 'base64')
        )

        if (rawMasterKey.length !== 32) {
            throw new Error('Invalid master key length after RSA-OAEP decryption')
        }

        // 2. Re-wrap symmetrically with LOCAL_MASTER_KEY (AES-256-GCM) for database storage
        const iv = crypto.randomBytes(12)
        const cipher = crypto.createCipheriv('aes-256-gcm', getSymmetricKey(), iv)
        const encrypted = Buffer.concat([cipher.update(rawMasterKey), cipher.final()])
        const tag = cipher.getAuthTag()

        rawMasterKey.fill(0)

        return JSON.stringify({
            ciphertext: Buffer.concat([encrypted, tag]).toString('base64'),
            iv: iv.toString('base64'),
        })
    }

    async unwrapMasterKey(wrappedMasterKey: string): Promise<Uint8Array> {
        const { ciphertext, iv } = JSON.parse(wrappedMasterKey)
        const combined = Buffer.from(ciphertext, 'base64')

        if (combined.length < 16) {
            throw new Error('Invalid ciphertext payload size')
        }

        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            getSymmetricKey(),
            Buffer.from(iv, 'base64')
        )
        decipher.setAuthTag(combined.subarray(combined.length - 16))

        const decrypted = Buffer.concat([
            decipher.update(combined.subarray(0, combined.length - 16)),
            decipher.final(),
        ])
        return new Uint8Array(decrypted)
    }

    async decryptRequestSecret(rsaWrappedValue: string): Promise<string> {
        // The client must have encrypted the plaintext secret with the KMS public key
        // (RSA-OAEP SHA-256) before sending it. If it wasn't, privateDecrypt throws here.
        const plaintext = crypto.privateDecrypt(
            {
                key: getKmsKeyPair().privateKey,
                oaepHash: 'sha256',
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            Buffer.from(rsaWrappedValue, 'base64')
        )
        return plaintext.toString('utf8')
    }
}

export const KMS: KeyManagementService = new MockLocalKMS()
