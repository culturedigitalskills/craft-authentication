import { base58 } from '@scure/base'

/**
 * Cross-platform utilities for base64 conversion that work in both the browser and Node.js.
 */
export function bytesToBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(bytes).toString('base64')
    }
    return btoa(String.fromCharCode(...bytes))
}

export function base64ToBytes(base64: string): Uint8Array {
    if (typeof Buffer !== 'undefined') {
        return new Uint8Array(Buffer.from(base64, 'base64'))
    }
    const binString = atob(base64)
    return Uint8Array.from(binString, (m) => m.charCodeAt(0))
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    }
    return bytes
}

// WebCrypto requires Uint8Array<ArrayBuffer>; this cast is safe because all Uint8Arrays
// produced by getRandomValues, base64ToBytes, and hexToBytes use plain ArrayBuffers.
function ab(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
    return bytes as Uint8Array<ArrayBuffer>
}

/**
 * Format a raw base58 string with a CRAFTS-V001- prefix and hyphens every 4 characters.
 */
export function formatRecoveryToken(base58Str: string): string {
    const chunks: string[] = []
    for (let i = 0; i < base58Str.length; i += 4) {
        chunks.push(base58Str.slice(i, i + 4))
    }
    return `CRAFTS-V001-${chunks.join('-')}`
}

/**
 * Parse a Recovery Token string by stripping whitespace, prefix, and hyphens.
 */
export function parseRecoveryToken(tokenStr: string): string {
    return tokenStr
        .replace(/CRAFTS-V001-/i, '')
        .replace(/[\s-]/g, '')
}

/**
 * Derive an AES-256-GCM wrapping key from a recovery token and salt.
 *
 * Tries Argon2id first (m=65536, t=3, p=4 per spec). Falls back to PBKDF2-HMAC-SHA256
 * with 600,000 iterations if Argon2id is unavailable in the current environment.
 * The `requiredKdf` parameter forces a specific algorithm when unwrapping a stored payload.
 */
async function deriveWrappingKey(
    cleanToken: string,
    salt: Uint8Array,
    requiredKdf?: 'argon2id' | 'pbkdf2'
): Promise<{ key: CryptoKey; kdf: 'argon2id' | 'pbkdf2' }> {
    const cryptoObj = globalThis.crypto

    if (requiredKdf !== 'pbkdf2') {
        try {
            const { argon2id } = await import('hash-wasm')
            const hashHex = await argon2id({
                password: new TextEncoder().encode(cleanToken),
                salt: ab(salt),
                parallelism: 4,
                iterations: 3,
                memorySize: 65536,
                hashLength: 32,
                outputType: 'hex',
            })
            const keyBytes = hexToBytes(hashHex)
            const key = await cryptoObj.subtle.importKey(
                'raw',
                ab(keyBytes),
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            )
            return { key, kdf: 'argon2id' }
        } catch {
            if (requiredKdf === 'argon2id') {
                throw new Error('Argon2id is required for this vault payload but is unavailable in this environment')
            }
            // Fall through to PBKDF2
        }
    }

    const keyMaterial = await cryptoObj.subtle.importKey(
        'raw',
        new TextEncoder().encode(cleanToken),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    )
    const key = await cryptoObj.subtle.deriveKey(
        { name: 'PBKDF2', salt: ab(salt), iterations: 600000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )
    return { key, kdf: 'pbkdf2' }
}

/**
 * 1. Generates 256 bits of random entropy as MasterVaultKey.
 * 2. Encodes it to Base58 and formats it as a Recovery Token.
 * 3. Derives a wrapping key via Argon2id (or PBKDF2 fallback) and encrypts the MasterVaultKey.
 * Returns: { rawMasterKey, recoveryToken, wrappedKeyPayload }
 */
export async function generateVaultSetup(): Promise<{
    rawMasterKey: Uint8Array
    recoveryToken: string
    wrappedKeyPayload: string
}> {
    const cryptoObj = globalThis.crypto

    // 1. Generate 256 bits of random entropy
    const rawMasterKey = cryptoObj.getRandomValues(new Uint8Array(32))

    // 2. Base58 Encode & Format as Recovery Token
    const b58String = base58.encode(rawMasterKey)
    const recoveryToken = formatRecoveryToken(b58String)

    // 3. Derive wrapping key from the recovery token
    const cleanToken = parseRecoveryToken(recoveryToken)
    const salt = cryptoObj.getRandomValues(new Uint8Array(16))
    const { key: derivedKey, kdf } = await deriveWrappingKey(cleanToken, salt)

    // 4. Encrypt the MasterVaultKey with the derived key
    const iv = cryptoObj.getRandomValues(new Uint8Array(12))
    const encryptedBuffer = await cryptoObj.subtle.encrypt(
        { name: 'AES-GCM', iv: ab(iv) },
        derivedKey,
        ab(rawMasterKey)
    )

    const wrappedKeyPayload = JSON.stringify({
        kdf,
        ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
        iv: bytesToBase64(iv),
        salt: bytesToBase64(salt),
    })

    return { rawMasterKey, recoveryToken, wrappedKeyPayload }
}

/**
 * Unwraps the MasterVaultKey using a plaintext Recovery Token.
 * Reads the `kdf` field from the payload to use the correct algorithm.
 */
export async function unwrapVaultKeyWithRecoveryToken(
    recoveryTokenStr: string,
    wrappedKeyPayloadJson: string
): Promise<Uint8Array> {
    const cryptoObj = globalThis.crypto
    const { kdf, ciphertext, iv, salt } = JSON.parse(wrappedKeyPayloadJson)

    const cleanToken = parseRecoveryToken(recoveryTokenStr)
    const saltBytes = base64ToBytes(salt)

    // kdf field absent means legacy PBKDF2 payload
    const { key: derivedKey } = await deriveWrappingKey(cleanToken, saltBytes, kdf ?? 'pbkdf2')

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
        { name: 'AES-GCM', iv: ab(base64ToBytes(iv)) },
        derivedKey,
        ab(base64ToBytes(ciphertext))
    )

    return new Uint8Array(decryptedBuffer)
}

/**
 * Encrypt a plaintext string using a 256-bit MasterVaultKey (AES-256-GCM).
 * Returns a JSON string containing the ciphertext and iv.
 */
export async function encryptPayload(
    plaintext: string,
    masterKey: Uint8Array
): Promise<string> {
    const cryptoObj = globalThis.crypto

    const aesKey = await cryptoObj.subtle.importKey(
        'raw',
        ab(masterKey),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    )

    const iv = cryptoObj.getRandomValues(new Uint8Array(12))
    const encryptedBuffer = await cryptoObj.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        new TextEncoder().encode(plaintext)
    )

    return JSON.stringify({
        ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
        iv: bytesToBase64(iv),
    })
}

/**
 * Decrypt a ciphertext JSON payload using the MasterVaultKey (AES-256-GCM).
 */
export async function decryptPayload(
    ciphertextJson: string,
    masterKey: Uint8Array
): Promise<string> {
    const cryptoObj = globalThis.crypto
    const { ciphertext, iv } = JSON.parse(ciphertextJson)

    const aesKey = await cryptoObj.subtle.importKey(
        'raw',
        ab(masterKey),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    )

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
        { name: 'AES-GCM', iv: ab(base64ToBytes(iv)) },
        aesKey,
        ab(base64ToBytes(ciphertext))
    )

    return new TextDecoder().decode(decryptedBuffer)
}

/**
 * Generates a VerificationToken = HMAC-SHA256(key=MasterVaultKey, message=userId + "CRAFTS-VAULT-VERIFICATION")
 */
export async function generateVerificationToken(
    masterKey: Uint8Array,
    userId: string
): Promise<string> {
    const cryptoObj = globalThis.crypto

    const hmacKey = await cryptoObj.subtle.importKey(
        'raw',
        ab(masterKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )

    const message = new TextEncoder().encode(userId + 'CRAFTS-VAULT-VERIFICATION')
    const signatureBuffer = await cryptoObj.subtle.sign('HMAC', hmacKey, ab(message))

    return bytesToBase64(new Uint8Array(signatureBuffer))
}

/**
 * Asymmetrically wrap the MasterVaultKey using a PEM-encoded RSA-OAEP public key.
 */
export async function asymmetricWrapMasterKey(
    masterKey: Uint8Array,
    publicKeyPem: string
): Promise<string> {
    const cryptoObj = globalThis.crypto

    const pemContents = publicKeyPem
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s/g, '')

    const spkiBuffer = base64ToBytes(pemContents)
    const rsaPublicKey = await cryptoObj.subtle.importKey(
        'spki',
        ab(spkiBuffer),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    )

    const encryptedBuffer = await cryptoObj.subtle.encrypt(
        { name: 'RSA-OAEP' },
        rsaPublicKey,
        ab(masterKey)
    )

    return bytesToBase64(new Uint8Array(encryptedBuffer))
}

/**
 * Asymmetrically wrap a plaintext secret string using a PEM-encoded RSA-OAEP public key.
 * Used by vault server function calls in E2E mode to send a specific secret to the server
 * for a single request without exposing the MasterVaultKey.
 */
export async function asymmetricWrapSecret(secret: string, publicKeyPem: string): Promise<string> {
    return asymmetricWrapMasterKey(new TextEncoder().encode(secret), publicKeyPem)
}
