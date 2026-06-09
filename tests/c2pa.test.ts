import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { hashPassword } from 'better-auth/crypto'
import crypto from 'crypto'
import { C2PAService } from '@/lib/c2pa-service'
import { generateVaultSetup, asymmetricWrapMasterKey, generateVerificationToken } from '@/lib/crypto-vault'
import { KMS } from '@/lib/kms'

// Minimal 1x1 transparent PNG file hex
const MINIMAL_PNG_HEX = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082'
const minimalPngBuffer = Buffer.from(MINIMAL_PNG_HEX, 'hex')

describe('C2PA Content Credentials Integration Tests', () => {
    let testUser1: any
    let testUser2: any
    let rawMasterKey1: Uint8Array
    let rawMasterKey2: Uint8Array

    beforeAll(async () => {
        // Setup User 1
        const email1 = `c2pa-tester-1-${crypto.randomUUID()}@example.com`
        const hashedPassword1 = await hashPassword('SecurePassword1!')
        testUser1 = await prisma.user.create({
            data: {
                email: email1,
                name: 'Artisan Alice',
                role: 'ARTISAN',
                isActive: true,
                accounts: {
                    create: {
                        providerId: 'credential',
                        accountId: email1,
                        password: hashedPassword1,
                    },
                },
            },
        })

        // Initialize Vault for User 1
        const setup1 = await generateVaultSetup()
        rawMasterKey1 = setup1.rawMasterKey
        const kmsPublicKey = KMS.getPublicWrappingKey()
        const asymmetricallyWrapped1 = await asymmetricWrapMasterKey(rawMasterKey1, kmsPublicKey)
        const wrappedKey1 = await KMS.wrapMasterKey(asymmetricallyWrapped1)
        const verifyToken1 = await generateVerificationToken(rawMasterKey1, testUser1.id)

        await prisma.userWrappedVaultKeys.create({
            data: {
                userId: testUser1.id,
                wrapMode: 'SSE_KMS',
                wrappedKey: wrappedKey1,
            }
        })

        // Generate C2PA credentials for User 1
        await C2PAService.generateAndStoreCredentials(testUser1.id, rawMasterKey1)

        // Setup User 2
        const email2 = `c2pa-tester-2-${crypto.randomUUID()}@example.com`
        const hashedPassword2 = await hashPassword('SecurePassword2!')
        testUser2 = await prisma.user.create({
            data: {
                email: email2,
                name: 'Artisan Bob',
                role: 'ARTISAN',
                isActive: true,
                accounts: {
                    create: {
                        providerId: 'credential',
                        accountId: email2,
                        password: hashedPassword2,
                    },
                },
            },
        })

        // Initialize Vault for User 2
        const setup2 = await generateVaultSetup()
        rawMasterKey2 = setup2.rawMasterKey
        const asymmetricallyWrapped2 = await asymmetricWrapMasterKey(rawMasterKey2, kmsPublicKey)
        const wrappedKey2 = await KMS.wrapMasterKey(asymmetricallyWrapped2)

        await prisma.userWrappedVaultKeys.create({
            data: {
                userId: testUser2.id,
                wrapMode: 'SSE_KMS',
                wrappedKey: wrappedKey2,
            }
        })

        // Generate C2PA credentials for User 2
        await C2PAService.generateAndStoreCredentials(testUser2.id, rawMasterKey2)
    })

    afterAll(async () => {
        // Clean up User 1
        if (testUser1) {
            await prisma.userWrappedVaultKeys.deleteMany({ where: { userId: testUser1.id } })
            await prisma.userSecrets.deleteMany({ where: { userId: testUser1.id } })
            await prisma.user.delete({ where: { id: testUser1.id } })
        }
        // Clean up User 2
        if (testUser2) {
            await prisma.userWrappedVaultKeys.deleteMany({ where: { userId: testUser2.id } })
            await prisma.userSecrets.deleteMany({ where: { userId: testUser2.id } })
            await prisma.user.delete({ where: { id: testUser2.id } })
        }
    })

    it('should inspect clean media and report no manifest', async () => {
        const inspect = await C2PAService.inspectManifest(minimalPngBuffer)
        expect(inspect.hasManifest).toBe(false)
        expect(inspect.authentic).toBe(false)
        expect(inspect.creatorUserId).toBeUndefined()
    })

    it('should inspect public/test/test_cr_no_manifest.png and report no manifest', async () => {
        const fs = require('fs')
        const path = require('path')
        const buf = fs.readFileSync(path.join(__dirname, '../public/test/test_cr_no_manifest.png'))
        const inspect = await C2PAService.inspectManifest(buf)
        expect(inspect.hasManifest).toBe(false)
    })

    it('should inspect public/test/test_cr_with_manifest.png and report manifest contents', async () => {
        const fs = require('fs')
        const path = require('path')
        const buf = fs.readFileSync(path.join(__dirname, '../public/test/test_cr_with_manifest.png'))
        const inspect = await C2PAService.inspectManifest(buf)
        expect(inspect.hasManifest).toBe(true)
        expect(inspect.authentic).toBe(true)
        expect(inspect.untrusted).toBe(false)
        expect(inspect.artisanName).toBe('Frank')
        expect(inspect.creatorUserId).toBe('ad6ed879-1596-4296-9329-1d79e24dda69')
        expect(inspect.issuer).toBe('Crafts C2PA Root CA')
        expect(inspect.validationStatus).toEqual([])
        expect(inspect.assertions).toHaveLength(1)
        expect(inspect.assertions[0].action).toBe('c2pa.created')
    })

    it('should sign clean media with C2PA manifest (initializeManifest) and verify successfully', async () => {
        const signedBuffer = await C2PAService.initializeManifest(
            testUser1.id,
            minimalPngBuffer,
            'image/png'
        )

        expect(signedBuffer).toBeDefined()
        expect(signedBuffer.byteLength).toBeGreaterThan(minimalPngBuffer.byteLength)

        const inspect = await C2PAService.inspectManifest(signedBuffer)
        expect(inspect.hasManifest).toBe(true)
        expect(inspect.authentic).toBe(true)
        expect(inspect.creatorUserId).toBe(testUser1.id)
        expect(inspect.artisanName).toBe('Artisan Alice')
        expect(inspect.issuer).toBe('Crafts C2PA Root CA')
    })

    it('should add edit assertions to the signed media (addEditAssertion) and preserve the chain', async () => {
        const signedBuffer = await C2PAService.initializeManifest(
            testUser1.id,
            minimalPngBuffer,
            'image/png'
        )

        const editedBuffer = await C2PAService.addEditAssertion(
            testUser1.id,
            signedBuffer,
            'image/png',
            'Resized the canvas to 1x1'
        )

        expect(editedBuffer).toBeDefined()
        expect(editedBuffer.byteLength).toBeGreaterThan(signedBuffer.byteLength)

        const inspect = await C2PAService.inspectManifest(editedBuffer)
        expect(inspect.hasManifest).toBe(true)
        expect(inspect.authentic).toBe(true)
        expect(inspect.creatorUserId).toBe(testUser1.id)
        expect(inspect.artisanName).toBe('Artisan Alice')
    })

    it('should throw an ownership mismatch error if User 2 tries to sign or modify User 1 assets', async () => {
        const signedByUser1 = await C2PAService.initializeManifest(
            testUser1.id,
            minimalPngBuffer,
            'image/png'
        )

        // User 2 trying to re-initialize User 1's image should be rejected
        await expect(
            C2PAService.initializeManifest(testUser2.id, signedByUser1, 'image/png')
        ).rejects.toThrow('Cannot overwrite content credentials belonging to a different creator.')

        // User 2 trying to add edit assertion on User 1's image should be rejected
        await expect(
            C2PAService.addEditAssertion(testUser2.id, signedByUser1, 'image/png', 'Malicious edit')
        ).rejects.toThrow('Cannot modify content credentials belonging to a different creator.')
    })

    it('should auto-renew the user certificate if auto-renew is enabled and within the 30-day window', async () => {
        // 1. Manually update certificate expiration date in the past / near future (e.g. 5 days from now)
        const nearExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        await prisma.user.update({
            where: { id: testUser1.id },
            data: {
                c2paAutoRenew: true,
                c2paCertExpiresAt: nearExpiry
            }
        })

        // Verify pre-renewal status
        let userDb = await prisma.user.findUnique({
            where: { id: testUser1.id },
            select: { c2paCertExpiresAt: true }
        })
        expect(userDb?.c2paCertExpiresAt?.getTime()).toBe(nearExpiry.getTime())

        // 2. Trigger auto-renew check
        await C2PAService.checkAndAutoRenew(testUser1.id)

        // 3. Verify certificate is successfully rotated (expiry date updated to ~365 days in future)
        userDb = await prisma.user.findUnique({
            where: { id: testUser1.id },
            select: { c2paCertExpiresAt: true }
        })

        expect(userDb?.c2paCertExpiresAt).toBeDefined()
        const daysToExpiry = (userDb!.c2paCertExpiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        expect(daysToExpiry).toBeGreaterThan(360) // Around 365 days
    })

    it('should NOT auto-renew the certificate if c2paAutoRenew is disabled', async () => {
        const nearExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        await prisma.user.update({
            where: { id: testUser1.id },
            data: {
                c2paAutoRenew: false,
                c2paCertExpiresAt: nearExpiry
            }
        })

        await C2PAService.checkAndAutoRenew(testUser1.id)

        const userDb = await prisma.user.findUnique({
            where: { id: testUser1.id },
            select: { c2paCertExpiresAt: true }
        })
        expect(userDb?.c2paCertExpiresAt?.getTime()).toBe(nearExpiry.getTime())
    })

    it('should generate C2PA certificate with custom CN specified by request and verify CN in signed asset', async () => {
        const customUserEmail = `c2pa-custom-cn-${crypto.randomUUID()}@example.com`
        const hashedPassword = await hashPassword('SecurePassword3!')
        const customUser = await prisma.user.create({
            data: {
                email: customUserEmail,
                name: 'Original Name',
                role: 'ARTISAN',
                isActive: true,
                accounts: {
                    create: {
                        providerId: 'credential',
                        accountId: customUserEmail,
                        password: hashedPassword,
                    },
                },
            },
        })

        const setup = await generateVaultSetup()
        const rawMasterKey = setup.rawMasterKey
        const kmsPublicKey = KMS.getPublicWrappingKey()
        const asymmetricallyWrapped = await asymmetricWrapMasterKey(rawMasterKey, kmsPublicKey)
        const wrappedKey = await KMS.wrapMasterKey(asymmetricallyWrapped)

        await prisma.userWrappedVaultKeys.create({
            data: {
                userId: customUser.id,
                wrapMode: 'SSE_KMS',
                wrappedKey: wrappedKey,
            }
        })

        const customCN = 'Custom Artisan CN Name'
        // Generate C2PA credentials with custom CN
        await C2PAService.generateAndStoreCredentials(customUser.id, rawMasterKey, customCN)

        // Sign minimal PNG
        const signedBuffer = await C2PAService.initializeManifest(customUser.id, minimalPngBuffer, 'image/png')

        // Inspect manifest and check CN
        const inspect = await C2PAService.inspectManifest(signedBuffer)
        expect(inspect.hasManifest).toBe(true)
        expect(inspect.authentic).toBe(true)
        expect(inspect.artisanName).toBe(customCN)

        // Cleanup
        await prisma.userWrappedVaultKeys.deleteMany({ where: { userId: customUser.id } })
        await prisma.userSecrets.deleteMany({ where: { userId: customUser.id } })
        await prisma.user.delete({ where: { id: customUser.id } })
    })

    it('should determine the correct quick c2pa state (none/owned/valid) for various assets and configurations', async () => {
        // 1. Unsigned media should return 'none'
        const stateNone = await C2PAService.getC2PAState(minimalPngBuffer, testUser1.id)
        expect(stateNone).toBe('none')

        // 2. Sign with User 1 credentials
        const signedBuffer = await C2PAService.initializeManifest(testUser1.id, minimalPngBuffer, 'image/png')

        // 3. Match against User 1 -> should return 'owned'
        const stateOwned = await C2PAService.getC2PAState(signedBuffer, testUser1.id)
        expect(stateOwned).toBe('owned')

        // 4. Match against User 2 -> should return 'valid'
        const stateValid = await C2PAService.getC2PAState(signedBuffer, testUser2.id)
        expect(stateValid).toBe('valid')
    })
})
