import crypto from 'crypto'

/**
 * KeyManagementService interface defines the contract for server-side
 * key wrapping and unwrapping operations.
 */
export interface KeyManagementService {
    getPublicWrappingKey(): string
    wrapMasterKey(asymmetricallyWrappedMasterKey: string): Promise<string>
    unwrapMasterKey(wrappedMasterKey: string): Promise<Uint8Array>
}

let rsaKeyPair: { publicKey: string; privateKey: string } | null = null

function getOrGenerateKeyPair() {
    if (!rsaKeyPair) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        })
        rsaKeyPair = { publicKey, privateKey }
    }
    return rsaKeyPair
}

function getSymmetricKey(): Buffer {
    // Falls back to a default key in development if LOCAL_MASTER_KEY is not set
    const envKey = process.env.LOCAL_MASTER_KEY || '0000000000000000000000000000000000000000000000000000000000000000'
    if (envKey.length === 64) {
        return Buffer.from(envKey, 'hex')
    }
    if (envKey.length === 44 && envKey.endsWith('=')) {
        return Buffer.from(envKey, 'base64')
    }
    return crypto.createHash('sha256').update(envKey).digest()
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
        return getOrGenerateKeyPair().publicKey
    }

    async wrapMasterKey(asymmetricallyWrappedMasterKey: string): Promise<string> {
        // 1. Decrypt client's asymmetrically wrapped MasterVaultKey using RSA-OAEP
        const bufferToDecrypt = Buffer.from(asymmetricallyWrappedMasterKey, 'base64')
        const rawMasterKey = crypto.privateDecrypt(
            {
                key: getOrGenerateKeyPair().privateKey,
                oaepHash: 'sha256',
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            bufferToDecrypt
        )

        if (rawMasterKey.length !== 32) {
            throw new Error('Invalid master key length decrypted in KMS')
        }

        // 2. Encrypt the raw MasterVaultKey symmetrically using AES-256-GCM with LOCAL_MASTER_KEY
        const iv = crypto.randomBytes(12)
        const cipher = crypto.createCipheriv('aes-256-gcm', getSymmetricKey(), iv)
        
        const encrypted = Buffer.concat([cipher.update(rawMasterKey), cipher.final()])
        const tag = cipher.getAuthTag()

        // Purge raw key from memory variables (highly recommended)
        rawMasterKey.fill(0)

        // Store ciphertext and authentication tag concatenated, plus IV
        return JSON.stringify({
            ciphertext: Buffer.concat([encrypted, tag]).toString('base64'),
            iv: iv.toString('base64'),
        })
    }

    async unwrapMasterKey(wrappedMasterKey: string): Promise<Uint8Array> {
        // 1. Parse symmetric payload
        const { ciphertext, iv } = JSON.parse(wrappedMasterKey)
        const ivBuffer = Buffer.from(iv, 'base64')
        const combined = Buffer.from(ciphertext, 'base64')

        if (combined.length < 16) {
            throw new Error('Invalid ciphertext payload size')
        }

        const ciphertextBuffer = combined.subarray(0, combined.length - 16)
        const tagBuffer = combined.subarray(combined.length - 16)

        // 2. Decrypt using AES-256-GCM with LOCAL_MASTER_KEY
        const decipher = crypto.createDecipheriv('aes-256-gcm', getSymmetricKey(), ivBuffer)
        decipher.setAuthTag(tagBuffer)

        const decrypted = Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()])
        return new Uint8Array(decrypted)
    }
}

export const KMS: KeyManagementService = new MockLocalKMS()
