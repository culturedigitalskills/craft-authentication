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
    asymmetricWrapSecret
} from '@/lib/crypto-vault'
import { KMS } from '@/lib/kms'
import { UserSecretsService } from '@/lib/user-secrets-service'

// Import route handlers directly to execute them in-memory
import { POST as initializePost } from '@/app/api/vault/initialize/route'
import { POST as secretsPost, GET as secretsGet } from '@/app/api/vault/secrets/route'
import { POST as rotateKeyPost } from '@/app/api/vault/rotate-key/route'
import { DELETE as escrowDelete } from '@/app/api/vault/escrow/route'
import { GET as keysGet } from '@/app/api/vault/keys/route'
import { GET as kmsPublicKeyGet } from '@/app/api/vault/kms-public-key/route'
import { GET as functionsGet } from '@/app/api/vault/functions/route'
import { POST as functionExecutePost } from '@/app/api/vault/functions/[name]/route'

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
    const testSecretPlaintext = 'my-super-secret-openai-api-key-12345'
    const secretType = 'OPENAI_API_KEY'

    const originalFetch = globalThis.fetch

    beforeAll(async () => {
        // Mock fetch for OpenRouter API requests
        globalThis.fetch = vi.fn(async (url: any, options: any) => {
            if (typeof url === 'string' && url.includes('openrouter.ai')) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        data: [{ url: 'https://example.com/mock-image.png' }]
                    })
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

        // Step 3: Call GET /api/vault/secrets to retrieve the secret
        const getRequest = new Request('http://localhost/api/vault/secrets', {
            method: 'GET',
        })

        const getResponse = await secretsGet()
        const getResBody = await getResponse.json()

        expect(getResponse.status).toBe(200)
        expect(getResBody.secrets.length).toBeGreaterThanOrEqual(1)

        const retrievedSecret = getResBody.secrets.find((s: any) => s.type === secretType)
        expect(retrievedSecret).toBeDefined()
        expect(retrievedSecret.ciphertextData).toBe(encryptedSecretPayload)

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

        // Step 3: Test GET /api/vault/functions
        const funcsRes = await functionsGet()
        const funcsBody = await funcsRes.json()
        expect(funcsRes.status).toBe(200)
        expect(funcsBody.functions).toBeDefined()
        expect(funcsBody.functions.length).toBeGreaterThan(0)
        const fluxFn = funcsBody.functions.find((f: any) => f.name === 'GENERATE_FLUX_IMAGE')
        expect(fluxFn).toBeDefined()
        expect(fluxFn.requiredSecretType).toBe('OPENROUTER_API_KEY')

        // Step 4: Test POST /api/vault/functions/GENERATE_FLUX_IMAGE in escrow mode
        const request = new Request('http://localhost/api/vault/functions/GENERATE_FLUX_IMAGE', {
            method: 'POST',
            body: JSON.stringify({
                args: { prompt: 'a cute cat' }
            })
        })
        const executeRes = await functionExecutePost(request, {
            params: Promise.resolve({ name: 'GENERATE_FLUX_IMAGE' })
        })
        const executeBody = await executeRes.json()
        expect(executeRes.status).toBe(200)
        expect(executeBody.result.url).toBe('https://example.com/mock-image.png')
    })

    it('should enforce security guards and handle edge cases', async () => {
        // Edge Case A: Request without authentication (session = null -> 401 Unauthorized)
        mockSession.user.id = '' // clear session
        
        const unauthReq = new Request('http://localhost/api/vault/keys', { method: 'GET' })
        const unauthRes = await keysGet()
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

        // Edge Case D: Attempting to delete escrow before E2E_PRF passkey wrapper is registered (400 Bad Request)
        const deleteEscrowNoPrfReq = new Request('http://localhost/api/vault/escrow', {
            method: 'DELETE',
            body: JSON.stringify({
                verification_token: verificationToken,
            }),
        })
        const deleteEscrowNoPrfRes = await escrowDelete(deleteEscrowNoPrfReq)
        const deleteEscrowNoPrfBody = await deleteEscrowNoPrfRes.json()
        expect(deleteEscrowNoPrfRes.status).toBe(400)
        expect(deleteEscrowNoPrfBody.error).toBe('Request failed')

        // Edge Case E: Attempting to delete escrow with an invalid verification token (401 Unauthorized)
        const mockPrfPayload = JSON.stringify({ ciphertext: 'abc', iv: 'def' })
        const tempPrfKey = await prisma.userWrappedVaultKeys.create({
            data: {
                userId: testUser.id,
                wrapMode: 'E2E_PRF',
                wrappedKey: mockPrfPayload,
                credentialId: 'temp-cred-id-hash',
            }
        })

        const deleteEscrowBadTokenReq = new Request('http://localhost/api/vault/escrow', {
            method: 'DELETE',
            body: JSON.stringify({
                verification_token: 'bogus-verification-token-base64',
            }),
        })
        const deleteEscrowBadTokenRes = await escrowDelete(deleteEscrowBadTokenReq)
        expect(deleteEscrowBadTokenRes.status).toBe(401)

        // Clean up the temporary E2E_PRF key
        await prisma.userWrappedVaultKeys.delete({ where: { id: tempPrfKey.id } })

        // Edge Case F: Attempting key rotation with an invalid verification token (401 Unauthorized)
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

    it('should test E2E-only path by adding passkey wrapper (E2E_PRF) and deleting server escrow', async () => {
        // Step 1: Simulate client-side passkey wrapper (E2E_PRF) creation
        const mockPrfKeyBytes = crypto.randomBytes(32)
        const mockPrfAesKey = await globalThis.crypto.subtle.importKey(
            'raw',
            mockPrfKeyBytes,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        )
        const mockPrfIv = crypto.randomBytes(12)
        const prfWrappedKeyBuffer = await globalThis.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: mockPrfIv },
            mockPrfAesKey,
            rawMasterKey
        )
        const prfWrappedKeyPayload = JSON.stringify({
            ciphertext: Buffer.from(prfWrappedKeyBuffer).toString('base64'),
            iv: mockPrfIv.toString('base64'),
        })
        const mockCredentialId = 'mock-credential-id-12345'

        // Step 2: Add E2E_PRF wrapped key to the database via a key rotation
        const kmsPublicKey = KMS.getPublicWrappingKey()
        const newAsymmetricallyWrappedKey = await asymmetricWrapMasterKey(rawMasterKey, kmsPublicKey)

        const rotateRequest = new Request('http://localhost/api/vault/rotate-key', {
            method: 'POST',
            body: JSON.stringify({
                new_recovery_token_wrapped_key: wrappedKeyPayload,
                new_sse_kms_asymmetrically_wrapped_key: newAsymmetricallyWrappedKey,
                new_prf_wrapped_key: prfWrappedKeyPayload,
                credential_id: mockCredentialId,
                re_encrypted_secrets: [
                    {
                        type: secretType,
                        ciphertext_data: encryptedSecretPayload,
                    },
                ],
                verification_token: verificationToken,
                new_verification_token: verificationToken,
            }),
        })

        const rotateResponse = await rotateKeyPost(rotateRequest)
        const rotateResBody = await rotateResponse.json()
        expect(rotateResponse.status).toBe(200)
        expect(rotateResBody.success).toBe(true)

        // Verify that we now have 3 wrapped keys in the DB (RECOVERY_TOKEN, SSE_KMS, E2E_PRF)
        const keysResponse = await keysGet()
        const keysResBody = await keysResponse.json()
        expect(keysResBody.wrappedKeys.length).toBe(3)

        const e2eKey = keysResBody.wrappedKeys.find((k: any) => k.wrapMode === 'E2E_PRF')
        expect(e2eKey).toBeDefined()
        expect(e2eKey.credentialId).toBeDefined() // stored hashed on server

        // Step 3: Delete the server escrow (SSE_KMS row) using DELETE /api/vault/escrow
        const deleteRequest = new Request('http://localhost/api/vault/escrow', {
            method: 'DELETE',
            body: JSON.stringify({
                verification_token: verificationToken,
            }),
        })

        const deleteResponse = await escrowDelete(deleteRequest)
        const deleteResBody = await deleteResponse.json()

        expect(deleteResponse.status).toBe(200)
        expect(deleteResBody.success).toBe(true)

        // Step 4: Verify in database that SSE_KMS wrapped key row is gone
        const keysPostDeleteResponse = await keysGet()
        const keysPostDeleteResBody = await keysPostDeleteResponse.json()
        expect(keysPostDeleteResBody.wrappedKeys.length).toBe(2)

        const modes = keysPostDeleteResBody.wrappedKeys.map((k: any) => k.wrapMode)
        expect(modes).toContain('RECOVERY_TOKEN')
        expect(modes).toContain('E2E_PRF')
        expect(modes).not.toContain('SSE_KMS')

        // Step 5: Verify that calling UserSecretsService without providing the MasterVaultKey fails (server locked out)
        await expect(
            UserSecretsService.getDecryptedSecret(testUser.id, secretType)
        ).rejects.toThrow(/KMS Escrow is disabled/)

        // Step 6: Verify that calling UserSecretsService with the provided MasterVaultKey still works
        const decryptedSecret = await UserSecretsService.getDecryptedSecret(
            testUser.id,
            secretType,
            rawMasterKey
        )
        expect(decryptedSecret).toBe(testSecretPlaintext)

        // Step 7: Test development-only Server Actions post-escrow-deletion
        // Key verification should fail as SSE_KMS row is deleted
        const verifyKeyResPost = await verifyClientDecodedKeyAction(
            testUser.id,
            Buffer.from(rawMasterKey).toString('base64')
        )
        expect(verifyKeyResPost.success).toBe(false)
        expect(verifyKeyResPost.error).toContain('No SSE_KMS')

        // Decryption without client key should fail
        const verifySecretResPostFail = await verifyDecryptedSecretAction(
            testUser.id,
            secretType
        )
        expect(verifySecretResPostFail.success).toBe(false)
        expect(verifySecretResPostFail.error).toContain('No server escrow')

        // Decryption with client key should succeed
        const verifySecretResPostSuccess = await verifyDecryptedSecretAction(
            testUser.id,
            secretType,
            Buffer.from(rawMasterKey).toString('base64')
        )
        expect(verifySecretResPostSuccess.success).toBe(true)
        expect(verifySecretResPostSuccess.decryptedValue).toBe(testSecretPlaintext)

        // Step 8: Test POST /api/vault/functions/GENERATE_FLUX_IMAGE in E2E mode
        // 8a. Execution without request_key should fail with 403 (Forbidden)
        const failReq = new Request('http://localhost/api/vault/functions/GENERATE_FLUX_IMAGE', {
            method: 'POST',
            body: JSON.stringify({
                args: { prompt: 'a cute dog' }
            })
        })
        const failExecuteRes = await functionExecutePost(failReq, {
            params: Promise.resolve({ name: 'GENERATE_FLUX_IMAGE' })
        })
        const failBody = await failExecuteRes.json()
        expect(failExecuteRes.status).toBe(403)
        expect(failBody.error).toContain('No SSE_KMS escrow found')

        // 8b. Execution with client asymmetric-wrapped secret should succeed
        const freshPublicKey = KMS.getPublicWrappingKey()
        const wrappedSecret = await asymmetricWrapSecret('my-openrouter-key-12345', freshPublicKey)

        const successReq = new Request('http://localhost/api/vault/functions/GENERATE_FLUX_IMAGE', {
            method: 'POST',
            body: JSON.stringify({
                args: { prompt: 'a cute dog' },
                request_key: {
                    secret_type: 'OPENROUTER_API_KEY',
                    encrypted_value: wrappedSecret,
                }
            })
        })
        const successExecuteRes = await functionExecutePost(successReq, {
            params: Promise.resolve({ name: 'GENERATE_FLUX_IMAGE' })
        })
        const successExecuteBody = await successExecuteRes.json()
        expect(successExecuteRes.status).toBe(200)
        expect(successExecuteBody.result.url).toBe('https://example.com/mock-image.png')
    })
})
