import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { hashPassword } from 'better-auth/crypto'
import crypto from 'crypto'
import {
    generateVaultSetup,
    unwrapVaultKeyWithRecoveryToken,
    encryptPayload,
    decryptPayload,
    generateVerificationToken,
    asymmetricWrapMasterKey,
} from '@/lib/crypto-vault'
import { KMS } from '@/lib/kms'
import { UserSecretsService } from '@/lib/user-secrets-service'

// Import route handlers directly to execute them in-memory
import { POST as initializePost } from '@/app/api/vault/initialize/route'
import { POST as secretsPost } from '@/app/api/vault/secrets/route'
import { GET as secretsHasGet } from '@/app/api/vault/secrets/[type]/route'
import { POST as rotateKeyPost } from '@/app/api/vault/rotate-key/route'
import { GET as vaultStatusGet } from '@/app/api/vault/status/route'
import { GET as kmsPublicKeyGet } from '@/app/api/vault/kms-public-key/route'

// Import Server Actions
import { verifyClientDecodedKeyAction, verifyDecryptedSecretAction } from '@/app/actions/vault'

// Mock requireAuth and auth in '@/lib/auth'
import { vi } from 'vitest'

const mockSession = {
    user: {
        id: '',
        name: 'Test User',
        email: 'test-user@example.com',
        role: 'ARTISAN' as const,
        isActive: true,
    },
    expires: new Date(Date.now() + 3600000).toISOString(),
}

vi.mock('@/lib/auth', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/lib/auth')>()
    return {
        ...original,
        auth: vi.fn(async () => {
            if (!mockSession.user.id) return null
            return mockSession
        }),
    }
})

describe('Cryptographic Vault Integration Tests', () => {
    let testUser: any
    let rawMasterKey: Uint8Array
    let recoveryToken: string
    let wrappedKeyPayload: string
    let verificationToken: string
    let encryptedSecretPayload: string
    const testSecretPlaintext = 'my-super-secret-c2pa-private-key-12345'
    const secretType = 'C2PA_PRIV'

    const originalFetch = globalThis.fetch

    beforeAll(async () => {
        // Mock fetch for OpenRouter API requests
        globalThis.fetch = vi.fn(async (url: any, options: any) => {
            const urlStr = typeof url === 'string'
                ? url
                : (url && typeof url === 'object' && 'url' in url ? url.url : String(url))
            if (urlStr.includes('openrouter.ai')) {
                const choicesData = {
                    id: 'chatcmpl-mock-12345',
                    object: 'chat.completion',
                    created: Math.floor(Date.now() / 1000),
                    model: 'sourceful/riverflow-v2.5-pro:free',
                    system_fingerprint: 'fp_mock_12345',
                    choices: [
                        {
                            index: 0,
                            finish_reason: 'stop',
                            message: {
                                role: 'assistant',
                                images: [
                                    {
                                        image_url: {
                                            url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
                return {
                    ok: true,
                    status: 200,
                    headers: {
                        get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null
                    },
                    json: async () => choicesData,
                    text: async () => JSON.stringify(choicesData),
                } as any
            }
            return originalFetch(url, options)
        })

        // 1. Add a test user with a known password in preparation
        const testEmail = `test-vault-user-${crypto.randomUUID()}@example.com`
        const knownPassword = 'MySecurePassword123!'
        const hashedPassword = await hashPassword(knownPassword)

        testUser = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Vault Tester',
                role: 'ARTISAN',
                isActive: true,
                accounts: {
                    create: {
                        providerId: 'credential',
                        accountId: testEmail,
                        password: hashedPassword,
                    },
                },
            },
        })

        // Configure mock session
        mockSession.user.id = testUser.id
        mockSession.user.email = testEmail
    })

    afterAll(async () => {
        globalThis.fetch = originalFetch
        if (testUser) {
            // Clean up
            await prisma.taskEvent.deleteMany({ where: { userId: testUser.id } })
            await prisma.mediaFile.deleteMany({ where: { uploaderId: testUser.id } })
            await prisma.userWrappedVaultKeys.deleteMany({ where: { userId: testUser.id } })
            await prisma.userSecrets.deleteMany({ where: { userId: testUser.id } })
            await prisma.user.delete({ where: { id: testUser.id } })
        }
    })

    it('should generate vault setup client-side and initialize vault on the server (RECOVERY_TOKEN + SSE_KMS)', async () => {
        // Step 1: Generate vault setup client-side
        const setup = await generateVaultSetup()
        rawMasterKey = setup.rawMasterKey
        recoveryToken = setup.recoveryToken
        wrappedKeyPayload = setup.wrappedKeyPayload

        expect(rawMasterKey).toBeInstanceOf(Uint8Array)
        expect(rawMasterKey.length).toBe(32)
        expect(recoveryToken.startsWith('CRAFTS-V001-')).toBe(true)
        expect(wrappedKeyPayload).toContain('kdf')

        // Step 2: Unwrap vault key using Recovery Token to confirm it works
        const unwrappedMasterKey = await unwrapVaultKeyWithRecoveryToken(recoveryToken, wrappedKeyPayload)
        expect(Buffer.compare(rawMasterKey, unwrappedMasterKey)).toBe(0)

        // Step 3: Client asymmetrically wraps the MasterVaultKey using KMS public key
        const kmsPublicKey = KMS.getPublicWrappingKey()
        const asymmetricallyWrappedKey = await asymmetricWrapMasterKey(rawMasterKey, kmsPublicKey)
        expect(asymmetricallyWrappedKey).toBeDefined()

        // Step 4: Generate VerificationToken
        verificationToken = await generateVerificationToken(rawMasterKey, testUser.id)
        expect(verificationToken).toBeDefined()

        // Step 5: Call API route to initialize the vault
        const request = new Request('http://localhost/api/vault/initialize', {
            method: 'POST',
            body: JSON.stringify({
                user_id: testUser.id,
                recovery_token_wrapped_key: wrappedKeyPayload,
                sse_kms_asymmetrically_wrapped_key: asymmetricallyWrappedKey,
                verification_token: verificationToken,
            }),
        })

        const response = await initializePost(request)
        const resBody = await response.json()

        expect(response.status).toBe(200)
        expect(resBody.success).toBe(true)

        // Step 6: Verify rows in database
        const wrappedKeys = await prisma.userWrappedVaultKeys.findMany({
            where: { userId: testUser.id },
        })

        expect(wrappedKeys.length).toBe(2)
        const recoveryRow = wrappedKeys.find(w => w.wrapMode === 'RECOVERY_TOKEN')
        const kmsRow = wrappedKeys.find(w => w.wrapMode === 'SSE_KMS')

        expect(recoveryRow).toBeDefined()
        expect(recoveryRow?.wrappedKey).toBe(wrappedKeyPayload)
        expect(kmsRow).toBeDefined()

        const userRow = await prisma.user.findUnique({
            where: { id: testUser.id },
            select: { masterKeyHash: true },
        })
        expect(userRow?.masterKeyHash).toBeDefined()
    })

    it('should store, retrieve, and decrypt user secrets', async () => {
        // Step 1: Client-side encrypt a secret payload
        encryptedSecretPayload = await encryptPayload(testSecretPlaintext, rawMasterKey)
        expect(encryptedSecretPayload).toContain('ciphertext')
        expect(encryptedSecretPayload).toContain('iv')

        // Step 2: Call POST /api/vault/secrets to save the secret
        const postRequest = new Request('http://localhost/api/vault/secrets', {
            method: 'POST',
            body: JSON.stringify({
                type: secretType,
                ciphertext_data: encryptedSecretPayload,
            }),
        })

        const postResponse = await secretsPost(postRequest)
        const postResBody = await postResponse.json()

        expect(postResponse.status).toBe(200)
        expect(postResBody.success).toBe(true)

        // Step 3: Check presence via GET /api/vault/secrets/:type
        const hasResponse = await secretsHasGet(
            new Request(`http://localhost/api/vault/secrets/${secretType}`),
            { params: Promise.resolve({ type: secretType }) }
        )
        const hasBody = await hasResponse.json()
        expect(hasResponse.status).toBe(200)
        expect(hasBody.present).toBe(true)

        // Step 4: Verify server-side decryption using UserSecretsService (KMS Escrow unwrapping)
        const serverDecryptedSecretKms = await UserSecretsService.getDecryptedSecret(testUser.id, secretType)
        expect(serverDecryptedSecretKms).toBe(testSecretPlaintext)

        // Step 5: Verify server-side decryption using client-provided key
        const serverDecryptedSecretProvided = await UserSecretsService.getDecryptedSecret(
            testUser.id,
            secretType,
            rawMasterKey
        )
        expect(serverDecryptedSecretProvided).toBe(testSecretPlaintext)

        // Step 6: Test development-only Server Actions in escrow mode
        const verifyKeyRes = await verifyClientDecodedKeyAction(
            testUser.id,
            Buffer.from(rawMasterKey).toString('base64')
        )
        expect(verifyKeyRes.success).toBe(true)

        const verifySecretRes = await verifyDecryptedSecretAction(
            testUser.id,
            secretType
        )
        expect(verifySecretRes.success).toBe(true)
        expect(verifySecretRes.decryptedValue).toBe(testSecretPlaintext)
    })

    it('should test kms-public-key and functions routing in escrow mode', async () => {
        // Step 1: Store an OPENROUTER_API_KEY secret
        const openrouterSecretEncrypted = await encryptPayload('my-openrouter-key-12345', rawMasterKey)
        const openrouterRequest = new Request('http://localhost/api/vault/secrets', {
            method: 'POST',
            body: JSON.stringify({
                type: 'OPENROUTER_API_KEY',
                ciphertext_data: openrouterSecretEncrypted,
            }),
        })
        const openrouterResponse = await secretsPost(openrouterRequest)
        expect(openrouterResponse.status).toBe(200)

        // Step 2: Test GET /api/vault/kms-public-key
        const kmsRes = await kmsPublicKeyGet()
        const kmsBody = await kmsRes.json()
        expect(kmsRes.status).toBe(200)
        expect(kmsBody.publicKey).toBeDefined()
        expect(kmsBody.publicKey).toContain('BEGIN PUBLIC KEY')

        // Step 3: Test createTaskEventAction and generateImageAction
        const { createTaskEventAction, generateImageAction } = await import('@/app/actions/generate-image')
        const task = await createTaskEventAction('a cute cat', 'sourceful/riverflow-v2.5-pro:free')
        const result = await generateImageAction(task.id)
        expect(result.success).toBe(true)

        // Poll task status until finished or timeout
        let completedTask = null
        for (let i = 0; i < 20; i++) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            completedTask = await prisma.taskEvent.findUnique({
                where: { id: task.id },
                include: { mediaFile: true }
            })
            if (completedTask?.receivedAt || completedTask?.errorAt) {
                break
            }
        }

        expect(completedTask?.receivedAt).toBeTruthy()
        expect(completedTask?.mediaFileId).toBeTruthy()
    })

    it('should enforce security guards and handle edge cases', async () => {
        // Edge Case A: Request without authentication (session = null -> 401 Unauthorized)
        mockSession.user.id = '' // clear session
        
        const unauthRes = await vaultStatusGet()
        expect(unauthRes.status).toBe(401)
        
        const unauthInitRes = await initializePost(new Request('http://localhost/api/vault/initialize', { method: 'POST' }))
        expect(unauthInitRes.status).toBe(401)

        // Restore authentication
        mockSession.user.id = testUser.id

        // Edge Case B: Initializing vault for another user (403 Forbidden)
        const foreignUserReq = new Request('http://localhost/api/vault/initialize', {
            method: 'POST',
            body: JSON.stringify({
                user_id: 'some-other-user-uuid',
                recovery_token_wrapped_key: wrappedKeyPayload,
                verification_token: verificationToken,
            }),
        })
        const foreignUserRes = await initializePost(foreignUserReq)
        expect(foreignUserRes.status).toBe(403)

        // Edge Case C: Initializing vault twice (409 Conflict)
        const doubleInitReq = new Request('http://localhost/api/vault/initialize', {
            method: 'POST',
            body: JSON.stringify({
                user_id: testUser.id,
                recovery_token_wrapped_key: wrappedKeyPayload,
                verification_token: verificationToken,
            }),
        })
        const doubleInitRes = await initializePost(doubleInitReq)
        expect(doubleInitRes.status).toBe(409)

        // Edge Case D: Attempting key rotation with an invalid verification token (401 Unauthorized)
        const rotateBadTokenReq = new Request('http://localhost/api/vault/rotate-key', {
            method: 'POST',
            body: JSON.stringify({
                new_recovery_token_wrapped_key: wrappedKeyPayload,
                verification_token: 'bogus-verification-token-base64',
            }),
        })
        const rotateBadTokenRes = await rotateKeyPost(rotateBadTokenReq)
        expect(rotateBadTokenRes.status).toBe(401)
    })

    it('should support key rotation (re-encrypting keys and secrets)', async () => {
        // Step 1: Generate new client-side vault setup
        const newSetup = await generateVaultSetup()
        const newRawMasterKey = newSetup.rawMasterKey
        const newRecoveryToken = newSetup.recoveryToken
        const newWrappedKeyPayload = newSetup.wrappedKeyPayload

        // Step 2: Client-side wrap the new key with KMS public key
        const kmsPublicKey = KMS.getPublicWrappingKey()
        const newAsymmetricallyWrappedKey = await asymmetricWrapMasterKey(newRawMasterKey, kmsPublicKey)

        // Step 3: Re-encrypt existing secrets under the new MasterVaultKey
        const newEncryptedSecretPayload = await encryptPayload(testSecretPlaintext, newRawMasterKey)
        const newOpenrouterSecretEncrypted = await encryptPayload('my-openrouter-key-12345', newRawMasterKey)
        const reEncryptedSecrets = [
            {
                type: secretType,
                ciphertext_data: newEncryptedSecretPayload,
            },
            {
                type: 'OPENROUTER_API_KEY',
                ciphertext_data: newOpenrouterSecretEncrypted,
            },
        ]

        // Step 4: Generate new VerificationToken
        const newVerificationToken = await generateVerificationToken(newRawMasterKey, testUser.id)

        // Step 5: Call POST /api/vault/rotate-key
        const rotateRequest = new Request('http://localhost/api/vault/rotate-key', {
            method: 'POST',
            body: JSON.stringify({
                new_recovery_token_wrapped_key: newWrappedKeyPayload,
                new_sse_kms_asymmetrically_wrapped_key: newAsymmetricallyWrappedKey,
                re_encrypted_secrets: reEncryptedSecrets,
                verification_token: verificationToken, // verifying with old token
                new_verification_token: newVerificationToken, // updating with new token
            }),
        })

        const rotateResponse = await rotateKeyPost(rotateRequest)
        const rotateResBody = await rotateResponse.json()

        expect(rotateResponse.status).toBe(200)
        expect(rotateResBody.success).toBe(true)

        // Step 6: Verify database contains the rotated values
        const wrappedKeys = await prisma.userWrappedVaultKeys.findMany({
            where: { userId: testUser.id },
        })

        expect(wrappedKeys.length).toBe(2)
        const recoveryRow = wrappedKeys.find(w => w.wrapMode === 'RECOVERY_TOKEN')
        expect(recoveryRow?.wrappedKey).toBe(newWrappedKeyPayload)

        const secrets = await prisma.userSecrets.findMany({
            where: { userId: testUser.id },
        })
        expect(secrets.length).toBe(2)
        
        const mainSecretRecord = secrets.find(s => s.type === secretType)
        const openrouterSecretRecord = secrets.find(s => s.type === 'OPENROUTER_API_KEY')
        expect(mainSecretRecord?.ciphertextData).toBe(newEncryptedSecretPayload)
        expect(openrouterSecretRecord?.ciphertextData).toBe(newOpenrouterSecretEncrypted)

        // Step 7: Verify server can decrypt using the rotated key
        const serverDecryptedSecretKms = await UserSecretsService.getDecryptedSecret(testUser.id, secretType)
        expect(serverDecryptedSecretKms).toBe(testSecretPlaintext)
        const serverDecryptedOpenrouterKms = await UserSecretsService.getDecryptedSecret(testUser.id, 'OPENROUTER_API_KEY')
        expect(serverDecryptedOpenrouterKms).toBe('my-openrouter-key-12345')

        // Update local variables for subsequent tests
        rawMasterKey = newRawMasterKey
        recoveryToken = newRecoveryToken
        wrappedKeyPayload = newWrappedKeyPayload
        verificationToken = newVerificationToken
        encryptedSecretPayload = newEncryptedSecretPayload
    })

})
