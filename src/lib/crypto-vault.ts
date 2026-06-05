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

export function base64ToBytes(base64: string): any {
    if (typeof Buffer !== 'undefined') {
        return new Uint8Array(Buffer.from(base64, 'base64'))
    }
    const binString = atob(base64)
    return Uint8Array.from(binString, (m) => m.charCodeAt(0))
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
 * 1. Generates 256 bits of random entropy as MasterVaultKey.
 * 2. Encodes it to Base58 and formats it as a Recovery Token.
 * 3. Derives a wrapping key via PBKDF2 (600,000 iterations) and encrypts the MasterVaultKey with it.
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

    // 3. Derive key from the recovery token using PBKDF2
    const cleanToken = parseRecoveryToken(recoveryToken)
    const keyMaterial = await cryptoObj.subtle.importKey(
        'raw',
        new TextEncoder().encode(cleanToken),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    )

    const salt = cryptoObj.getRandomValues(new Uint8Array(16))
    const derivedKey = await cryptoObj.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 600000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    )

    // 4. Encrypt the MasterVaultKey with the derived key
    const iv = cryptoObj.getRandomValues(new Uint8Array(12))
    const encryptedBuffer = await cryptoObj.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        derivedKey,
        rawMasterKey
    )

    const wrappedKeyPayload = JSON.stringify({
        ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
        iv: bytesToBase64(iv),
        salt: bytesToBase64(salt),
    })

    return {
        rawMasterKey,
        recoveryToken,
        wrappedKeyPayload,
    }
}

/**
 * Unwraps the MasterVaultKey using a plaintext Recovery Token.
 */
export async function unwrapVaultKeyWithRecoveryToken(
    recoveryTokenStr: string,
    wrappedKeyPayloadJson: string
): Promise<Uint8Array> {
    const cryptoObj = globalThis.crypto
    const { ciphertext, iv, salt } = JSON.parse(wrappedKeyPayloadJson)

    const cleanToken = parseRecoveryToken(recoveryTokenStr)
    const keyMaterial = await cryptoObj.subtle.importKey(
        'raw',
        new TextEncoder().encode(cleanToken),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    )

    const derivedKey = await cryptoObj.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: base64ToBytes(salt) as any,
            iterations: 600000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    )

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: base64ToBytes(iv),
        },
        derivedKey,
        base64ToBytes(ciphertext)
    )

    return new Uint8Array(decryptedBuffer)
}

/**
 * Encrypt a plaintext string using a 256-bit MasterVaultKey (AES-256-GCM).
 * Returns a JSON string containing the ciphertext and iv.
 */
export async function encryptPayload(
    plaintext: string,
    masterKey: any
): Promise<string> {
    const cryptoObj = globalThis.crypto

    const aesKey = await cryptoObj.subtle.importKey(
        'raw',
        masterKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    )

    const iv = cryptoObj.getRandomValues(new Uint8Array(12))
    const encryptedBuffer = await cryptoObj.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
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
    masterKey: any
): Promise<string> {
    const cryptoObj = globalThis.crypto
    const { ciphertext, iv } = JSON.parse(ciphertextJson)

    const aesKey = await cryptoObj.subtle.importKey(
        'raw',
        masterKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    )

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: base64ToBytes(iv),
        },
        aesKey,
        base64ToBytes(ciphertext)
    )

    return new TextDecoder().decode(decryptedBuffer)
}

/**
 * Generates a VerificationToken = HMAC-SHA256(key=MasterVaultKey, message=userId + "CRAFTS-VAULT-VERIFICATION")
 */
export async function generateVerificationToken(
    masterKey: any,
    userId: string
): Promise<string> {
    const cryptoObj = globalThis.crypto

    const hmacKey = await cryptoObj.subtle.importKey(
        'raw',
        masterKey,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )

    const message = new TextEncoder().encode(userId + 'CRAFTS-VAULT-VERIFICATION')
    const signatureBuffer = await cryptoObj.subtle.sign(
        'HMAC',
        hmacKey,
        message
    )

    return bytesToBase64(new Uint8Array(signatureBuffer))
}

/**
 * Asymmetrically wrap the MasterVaultKey using a PEM-encoded RSA-OAEP public key.
 */
export async function asymmetricWrapMasterKey(
    masterKey: any,
    publicKeyPem: string
): Promise<string> {
    const cryptoObj = globalThis.crypto

    // Strip PEM headers/footers and whitespace
    const pemContents = publicKeyPem
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s/g, '')

    const spkiBuffer = base64ToBytes(pemContents)
    const rsaPublicKey = await cryptoObj.subtle.importKey(
        'spki',
        spkiBuffer,
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256',
        },
        false,
        ['encrypt']
    )

    const encryptedBuffer = await cryptoObj.subtle.encrypt(
        { name: 'RSA-OAEP' },
        rsaPublicKey,
        masterKey
    )

    return bytesToBase64(new Uint8Array(encryptedBuffer))
}
