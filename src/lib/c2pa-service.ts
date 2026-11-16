import { certificateAccountUri, verifiedRegistryAccount } from '@/lib/c2pa-identity'
import { tmpdir } from 'node:os'
import { createAsyncSigner } from '@/lib/c2pa-signer'
import 'server-only'
import crypto from 'crypto'
import { execFileSync } from 'child_process'
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { KMS } from '@/lib/kms'
import { getC2PARootKeys, getC2PATrustList } from '@/lib/c2pa-config'
import { UserSecretsService } from '@/lib/user-secrets-service'
import {
    Reader,
    Builder,
    createTrustSettings,
    createVerifySettings,
    mergeSettings,
    settingsToJson,
} from '@contentauth/c2pa-node'
import type { C2PAState } from '@/types/c2pa'

// How close to expiry a certificate must be before the sweep renews it.
const RENEWAL_WINDOW_DAYS = 30

// CLI tool helper removed as we transitioned to @contentauth/c2pa-node

function getExtensionForMimeType(mimeType: string): string {
    switch (mimeType) {
        case 'image/jpeg':
        case 'image/jpg':
            return '.jpg'
        case 'image/png':
            return '.png'
        case 'image/webp':
            return '.webp'
        default:
            return '.jpg'
    }
}

function detectExtension(buffer: Buffer): string {
    if (
        buffer.length >= 4 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
    ) {
        return '.png'
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return '.jpg'
    }
    if (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
        return '.webp'
    }
    return '.jpg'
}

/**
 * Server-side implementation of AES-256-GCM encryption
 * to match the client-side/secret payload format.
 */
export function encryptPayloadServer(plaintext: string, masterKey: Uint8Array): string {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(masterKey), iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    const combined = Buffer.concat([ciphertext, tag])

    return JSON.stringify({
        ciphertext: combined.toString('base64'),
        iv: iv.toString('base64'),
    })
}

export interface C2PAManifestResult {
    hasManifest: boolean
    creatorUserId?: string
    artisanName?: string
    issuer?: string
    authentic: boolean
    untrusted?: boolean
    validationStatus: string[]
    manifest?: any
    date?: string | null
    assertions?: any[]
}

export class C2PAService {
    /**
     * Renew the certificate of everyone who asked for auto-renewal and whose
     * certificate falls due inside the window.
     *
     * This used to run from auth(), fired per request for the signed-in user.
     * That cost a user lookup on every authenticated request, before the early
     * return could even be reached, and auth() runs twice for an API call: once
     * in the proxy and once in the handler. A page showing ten of the owner's
     * own images paid for it twenty times over, to learn twenty times that
     * nothing was due.
     *
     * Certificates expire on a scale of months and the window is thirty days,
     * so the hourly sweep that already reclaims orphaned jobs is ample, and one
     * query now finds everybody due instead of one query per request finding
     * almost nobody.
     */
    static async renewExpiringCertificates(): Promise<void> {
        const dueBy = new Date(Date.now() + RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000)
        const due = await prisma.user.findMany({
            where: {
                c2paAutoRenew: true,
                c2paCertExpiresAt: { not: null, lte: dueBy },
            },
            select: { id: true },
        })

        for (const user of due) {
            await C2PAService.renewCertificate(user.id)
        }
    }

    /** One user's renewal. Never throws: one failure must not stop the sweep. */
    private static async renewCertificate(userId: string): Promise<void> {
        try {
            const escrowRecord = await prisma.userWrappedVaultKeys.findFirst({
                where: { userId, wrapMode: 'SSE_KMS' },
            })
            if (!escrowRecord) return // KMS Escrow must be active

            const masterKey = await KMS.unwrapMasterKey(escrowRecord.wrappedKey)

            // Generate and save new credentials
            await C2PAService.generateAndStoreCredentials(userId, masterKey)

            masterKey.fill(0) // Wipe from memory
            console.log(`Successfully auto-renewed C2PA certificate for user ${userId}`)
        } catch (error) {
            console.error(`Failed auto-renewing C2PA certificate for user ${userId}:`, error)
        }
    }

    /**
     * Generates a new key pair and signs the certificate, then stores them in the vault.
     */
    static async generateAndStoreCredentials(
        userId: string,
        masterKey: Uint8Array,
        commonName?: string,
    ): Promise<void> {
        let artisanName = commonName
        if (!artisanName) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    name: true,
                    email: true,
                    artisan: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            })
            if (!user) throw new Error('User not found')

            if (user.artisan?.firstName && user.artisan?.lastName) {
                artisanName = `${user.artisan.firstName} ${user.artisan.lastName}`.trim()
            } else if (user.name) {
                artisanName = user.name
            } else {
                artisanName = user.email.split('@')[0] || 'Unknown Artisan'
            }
        }

        // 1. Generate EC keys and sign cert
        const { privateKey, certificateChain, expiresAt } = await C2PAService.generateArtisanKeys(
            userId,
            artisanName,
        )

        // 2. Encrypt using MasterVaultKey on the server
        const encryptedPriv = encryptPayloadServer(privateKey, masterKey)
        const encryptedPub = encryptPayloadServer(certificateChain, masterKey)

        // 3. Update secrets in database and user cert expiration date
        await prisma.$transaction(async (tx) => {
            const existingPriv = await tx.userSecrets.findFirst({
                where: { userId, type: 'C2PA_PRIV' },
            })
            if (existingPriv) {
                await tx.userSecrets.update({
                    where: { id: existingPriv.id },
                    data: { ciphertextData: encryptedPriv },
                })
            } else {
                await tx.userSecrets.create({
                    data: { userId, type: 'C2PA_PRIV', ciphertextData: encryptedPriv },
                })
            }

            const existingPub = await tx.userSecrets.findFirst({
                where: { userId, type: 'C2PA_PUB' },
            })
            if (existingPub) {
                await tx.userSecrets.update({
                    where: { id: existingPub.id },
                    data: { ciphertextData: encryptedPub },
                })
            } else {
                await tx.userSecrets.create({
                    data: { userId, type: 'C2PA_PUB', ciphertextData: encryptedPub },
                })
            }

            await tx.user.update({
                where: { id: userId },
                data: { c2paCertExpiresAt: expiresAt },
            })
        })
    }

    /**
     * Pure server-side function to initialize C2PA on a new media buffer.
     * Signs and embeds the initial creation manifest, returning the signed buffer.
     * Throws an error if a manifest already exists belonging to someone else.
     */
    static async initializeManifest(
        userId: string,
        mediaBuffer: Buffer,
        mimeType: string,
        generationMetadata?: {
            service: string
            model: string
            size: string
            prompt: string
        },
    ): Promise<Buffer> {
        const manifestInfo = await C2PAService.inspectManifest(mediaBuffer)
        if (manifestInfo.hasManifest && manifestInfo.creatorUserId !== userId) {
            throw new Error(
                'Cannot overwrite content credentials belonging to a different creator.',
            )
        }

        const { privateKey, certificate } = await C2PAService.getDecryptedArtisanCredentials(userId)

        const certChain = Buffer.from(certificate, 'utf8')
        const leafKey = Buffer.from(privateKey, 'utf8')
        const signer = createAsyncSigner(certChain, leafKey)

        const createdAction: any = {
            action: generationMetadata ? 'c2pa.created' : 'org.sustainablecrafting.uploaded',
            softwareAgent: 'Crafts Registry v1',
            timestamp: new Date().toISOString(),
            description: 'Uploaded to Crafts Registry',
        }

        if (generationMetadata) {
            createdAction.digitalSourceType =
                'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'
            createdAction.parameters = {
                description: `AI generated via ${generationMetadata.service} and uploaded to Crafts Registry`,
                ...generationMetadata,
            }
        }

        const manifestDefinition = {
            claim_generator: 'Crafts Registry',
            claim_generator_info: [
                {
                    name: 'Crafts Registry',
                    version: '1.0.0',
                },
            ],
            assertions: [
                {
                    label: 'c2pa.actions',
                    data: {
                        actions: [createdAction],
                    },
                },
            ],
        }

        const builder = await Builder.withJsonAsync(manifestDefinition)
        if (!generationMetadata) {
            // Uploading is not evidence of digital capture or creation. Record
            // opening the existing asset, preserve it as a parent ingredient,
            // and describe only the upload performed by this registry.
            builder.setIntent('edit')
            await builder.addIngredient(
                JSON.stringify({
                    title: 'Uploaded source',
                    format: mimeType,
                    relationship: 'parentOf',
                }),
                { buffer: mediaBuffer, mimeType },
            )
        }
        const input = { buffer: mediaBuffer, mimeType }
        const output: { buffer: Buffer | null } = { buffer: null }

        await builder.signAsync(signer, input, output)

        if (!output.buffer) {
            throw new Error('C2PA initializeManifest failed: output buffer is null')
        }

        return output.buffer
    }

    /**
     * Adds a new commission manifest on top of an image that already carries a C2PA manifest
     * (e.g. one generated by an AI model).  Records that the user commissioned the generation
     * via our platform, preserving the original AI-signed manifest as a parent ingredient.
     */
    static async addCommissionManifest(
        userId: string,
        mediaBuffer: Buffer,
        mimeType: string,
        commissionDetails: {
            service: string
            model: string
            size: string
            prompt: string
        },
    ): Promise<Buffer> {
        const { privateKey, certificate } = await C2PAService.getDecryptedArtisanCredentials(userId)

        const certChain = Buffer.from(certificate, 'utf8')
        const leafKey = Buffer.from(privateKey, 'utf8')
        const signer = createAsyncSigner(certChain, leafKey)

        const manifestDefinition = {
            claim_generator: 'Crafts Registry',
            claim_generator_info: [
                {
                    name: 'Crafts Registry',
                    version: '1.0.0',
                },
            ],
            assertions: [
                {
                    label: 'c2pa.actions',
                    data: {
                        actions: [
                            {
                                action: 'c2pa.published',
                                digitalSourceType:
                                    'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
                                softwareAgent: 'Crafts Registry v1',
                                timestamp: new Date().toISOString(),
                                parameters: {
                                    description: `AI generated via ${commissionDetails.service} and uploaded to Crafts Registry`,
                                    ...commissionDetails,
                                },
                            },
                        ],
                    },
                },
            ],
        }

        const builder = await Builder.withJsonAsync(manifestDefinition)

        builder.setIntent('edit')

        // Preserve the AI model's signed manifest in the provenance chain
        await builder.addIngredient(
            JSON.stringify({
                title: 'AI Generated Source',
                format: mimeType,
                relationship: 'parentOf',
            }),
            { buffer: mediaBuffer, mimeType },
        )

        const input = { buffer: mediaBuffer, mimeType }
        const output: { buffer: Buffer | null } = { buffer: null }

        await builder.signAsync(signer, input, output)

        if (!output.buffer) {
            throw new Error('C2PA addCommissionManifest failed: output buffer is null')
        }

        return output.buffer
    }

    /**
     * Pure server-side function to add a new edit record assertion to the media manifest.
     * Takes the existing media buffer, appends the edit description, and signs it.
     * Throws an error if a manifest already exists belonging to someone else.
     */
    static async addEditAssertion(
        userId: string,
        mediaBuffer: Buffer,
        mimeType: string,
        editDescription: string,
    ): Promise<Buffer> {
        const manifestInfo = await C2PAService.inspectManifest(mediaBuffer)
        if (manifestInfo.hasManifest && manifestInfo.creatorUserId !== userId) {
            throw new Error('Cannot modify content credentials belonging to a different creator.')
        }

        const { privateKey, certificate } = await C2PAService.getDecryptedArtisanCredentials(userId)

        const certChain = Buffer.from(certificate, 'utf8')
        const leafKey = Buffer.from(privateKey, 'utf8')
        const signer = createAsyncSigner(certChain, leafKey)

        const manifestDefinition = {
            claim_generator: 'Crafts Registry',
            claim_generator_info: [
                {
                    name: 'Crafts Registry',
                    version: '1.0.0',
                },
            ],
            assertions: [
                {
                    label: 'c2pa.actions',
                    data: {
                        actions: [
                            {
                                action: 'c2pa.edited',
                                parameters: { description: editDescription },
                                softwareAgent: 'Crafts Registry Editor v1',
                                timestamp: new Date().toISOString(),
                            },
                        ],
                    },
                },
            ],
        }

        const builder = await Builder.withJsonAsync(manifestDefinition)
        builder.setIntent('edit')
        const parentJson = {
            title: 'Parent Image',
            format: mimeType,
            relationship: 'parentOf',
        }
        await builder.addIngredient(JSON.stringify(parentJson), { buffer: mediaBuffer, mimeType })

        const input = { buffer: mediaBuffer, mimeType }
        const output = { buffer: null }

        await builder.signAsync(signer, input, output)

        if (!output.buffer) {
            throw new Error('C2PA addEditAssertion failed: output buffer is null')
        }

        return output.buffer
    }

    /**
     * Inspects C2PA metadata in a media buffer. Returns validation status and claims.
     */
    static async inspectManifest(mediaBuffer: Buffer): Promise<C2PAManifestResult> {
        try {
            console.log('Inspecting C2PA manifest for uploaded media...')
            const ext = detectExtension(mediaBuffer)
            const mimeType =
                ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'

            const { certificate: rootCertPem } = getC2PARootKeys()
            const ourCert = rootCertPem.replace(/\r\n/g, '\n')

            // Combine the official C2PA trust list with our own CA so both
            // third-party signers (Google, Adobe, …) and artisan certs are trusted.
            // If the trust list file is absent (see scripts/download-c2pa-trust-list.mjs),
            // getC2PATrustList() logs an error and returns null — we fall back to our CA only.
            const trustListPem = getC2PATrustList()

            const settingsString = settingsToJson(
                mergeSettings(
                    createTrustSettings({
                        verifyTrustList: true,
                        userAnchors: ourCert,
                        trustAnchors: trustListPem ? trustListPem : undefined,
                    }),
                    createVerifySettings({ verifyTrust: true }),
                ),
            )

            let reader: Reader | null = null
            try {
                reader = await Reader.fromAsset({ buffer: mediaBuffer, mimeType }, settingsString)
            } catch (err: any) {
                if (
                    err.message?.includes('JumbfNotFound') ||
                    err.message?.includes('No claim found')
                ) {
                    return { hasManifest: false, authentic: false, validationStatus: [] }
                }
                console.error('C2PA Reader.fromAsset error:', err)
                return {
                    hasManifest: false,
                    authentic: false,
                    validationStatus: [err.message || 'Signature verification failed'],
                }
            }

            if (!reader) {
                return { hasManifest: false, authentic: false, validationStatus: [] }
            }

            const json = reader.json()
            const activeManifestId = json.active_manifest
            if (!activeManifestId) {
                return { hasManifest: false, authentic: false, validationStatus: [] }
            }
            const activeManifest = json.manifests?.[activeManifestId]

            if (!activeManifest) {
                return { hasManifest: false, authentic: false, validationStatus: [] }
            }

            const validationStatus: string[] = []
            let authentic = true
            let untrusted = false

            if (json.validation_status && json.validation_status.length > 0) {
                for (const status of json.validation_status) {
                    validationStatus.push(`${status.code}: ${status.explanation}`)
                }
            }

            const failures = json.validation_results?.activeManifest?.failure || []
            if (failures.length > 0) {
                const realFailures = failures.filter(
                    (f: any) => f.code !== 'signingCredential.untrusted',
                )
                if (realFailures.length > 0) {
                    authentic = false
                }
                if (failures.some((f: any) => f.code === 'signingCredential.untrusted')) {
                    untrusted = true
                }
                for (const failure of failures) {
                    const statusStr = `${failure.code}: ${failure.explanation}`
                    if (!validationStatus.includes(statusStr)) {
                        validationStatus.push(statusStr)
                    }
                }
            }

            const signatureInfo = activeManifest.signature_info
            let artisanName = 'Unknown Artisan'
            let issuer = 'Sustainable Crafting CA'

            if (signatureInfo) {
                artisanName = signatureInfo.common_name || 'Unknown Artisan'
                issuer = signatureInfo.issuer || 'Sustainable Crafting CA'
                if (authentic && issuer === 'Sustainable Crafting Registry') {
                    issuer = 'Crafts C2PA Root CA'
                }
            }

            const creatorUserId = authentic
                ? await verifiedRegistryAccount(reader, activeManifestId, ourCert)
                : undefined

            let date: string | null = activeManifest.signature_info?.time || null

            const untrustedManifestIds = new Set<string>()
            const failedManifestIds = new Set<string>()
            if (json.validation_status && json.validation_status.length > 0) {
                for (const status of json.validation_status) {
                    if (status.url) {
                        const match = status.url.match(/\/c2pa\/([^/]+)/)
                        if (match) {
                            if (status.code === 'signingCredential.untrusted') {
                                untrustedManifestIds.add(match[1])
                            } else {
                                failedManifestIds.add(match[1])
                            }
                        }
                    }
                }
            }

            if (json.validation_results) {
                for (const key of Object.keys(json.validation_results)) {
                    const group = (json.validation_results as any)[key]
                    const failures = group?.failure || []
                    for (const failure of failures) {
                        if (failure.url) {
                            const match = failure.url.match(/\/c2pa\/([^/]+)/)
                            if (match) {
                                if (failure.code === 'signingCredential.untrusted') {
                                    untrustedManifestIds.add(match[1])
                                } else {
                                    failedManifestIds.add(match[1])
                                }
                            }
                        }
                    }
                }
            }

            // Walk the full ingredient chain (oldest ancestor first) to build a
            // complete provenance timeline across all manifests.
            const assertions: any[] = []
            const visitedManifests = new Set<string>()

            function collectAssertions(manifestId: string) {
                if (visitedManifests.has(manifestId)) return
                visitedManifests.add(manifestId)

                const manifest = json.manifests?.[manifestId]
                if (!manifest) return

                // Recurse into ingredients first so the oldest actions appear first
                if (manifest.ingredients) {
                    for (const ingredient of manifest.ingredients) {
                        if (ingredient.active_manifest) {
                            collectAssertions(ingredient.active_manifest)
                        }
                    }
                }

                const signerName = manifest.signature_info?.common_name || 'Unknown'
                const signerIssuer = manifest.signature_info?.issuer || 'Unknown'
                const signerTime = manifest.signature_info?.time || null

                const actionsAssertion = manifest.assertions?.find(
                    (a: any) => a.label === 'c2pa.actions' || a.label === 'c2pa.actions.v2',
                ) as any
                if (actionsAssertion?.data?.actions) {
                    for (const act of actionsAssertion.data.actions) {
                        // c2pa.opened is an internal ingredient reference — not user-facing
                        if (act.action === 'c2pa.opened') continue
                        assertions.push({
                            action: act.action,
                            description: act.description || act.parameters?.description || null,
                            softwareAgent: act.softwareAgent || signerName,
                            timestamp: act.timestamp || signerTime,
                            parameters: act.parameters || null,
                            digitalSourceType: act.digitalSourceType || null,
                            signer: signerName,
                            issuer: signerIssuer,
                            untrusted: untrustedManifestIds.has(manifestId),
                            invalid: failedManifestIds.has(manifestId),
                        })
                    }
                }
            }

            collectAssertions(activeManifestId)

            return {
                hasManifest: true,
                creatorUserId,
                artisanName,
                issuer,
                authentic,
                untrusted,
                validationStatus,
                manifest: json,
                date,
                assertions,
            }
        } catch (globalError: any) {
            console.error('C2PA inspectManifest global error:', globalError)
            return {
                hasManifest: false,
                authentic: false,
                validationStatus: ['Inspection failed: ' + globalError.message],
            }
        }
    }

    /**
     * Internally generates keys and signs the certificate using OpenSSL command.
     */
    private static async generateArtisanKeys(
        userId: string,
        artisanName: string,
    ): Promise<{ privateKey: string; certificateChain: string; expiresAt: Date }> {
        if (
            !artisanName.trim() ||
            Array.from(artisanName).length > 64 ||
            /[\r\n\0]/.test(artisanName)
        ) {
            throw new Error('Signing name must contain 1–64 characters without control characters')
        }
        const accountUri = certificateAccountUri(userId)
        const tempDir = mkdtempSync(join(tmpdir(), 'craft-c2pa-'))
        const keyPath = join(tempDir, 'key.pem')
        const csrPath = join(tempDir, 'request.pem')
        const certPath = join(tempDir, 'certificate.pem')
        const confPath = join(tempDir, 'openssl.cnf')
        try {
            const { certificate: rootCert } = getC2PARootKeys()
            // User-supplied names never enter an OpenSSL config or a shell.
            const subjectName = artisanName.replace(/[\\/+]/g, '\\$&')
            const subject = '/C=US/O=Sustainable Crafting Registry/CN=' + subjectName
            const config = [
                '[ req ]',
                'distinguished_name = subject',
                'req_extensions = v3_req',
                'prompt = no',
                'utf8 = yes',
                '[ subject ]',
                '[ v3_req ]',
                'basicConstraints = CA:FALSE',
                'keyUsage = critical, digitalSignature',
                'extendedKeyUsage = emailProtection, 1.3.6.1.5.5.7.3.36',
                'subjectAltName = URI:' + accountUri,
            ].join('\n')
            writeFileSync(confPath, config, { encoding: 'utf8', mode: 0o600 })
            execFileSync(
                'openssl',
                [
                    'req',
                    '-new',
                    '-nodes',
                    '-newkey',
                    'ec',
                    '-pkeyopt',
                    'ec_paramgen_curve:prime256v1',
                    '-utf8',
                    '-keyout',
                    keyPath,
                    '-out',
                    csrPath,
                    '-config',
                    confPath,
                    '-subj',
                    subject,
                ],
                { stdio: 'ignore' },
            )
            const serial = crypto.randomBytes(20)
            serial[0] = serial[0] & 0x7f || 1
            // A random positive serial avoids writing a .srl file into a read-only CA mount.
            execFileSync(
                'openssl',
                [
                    'x509',
                    '-req',
                    '-in',
                    csrPath,
                    '-CA',
                    process.env.C2PA_ROOT_CERT_PATH!,
                    '-CAkey',
                    process.env.C2PA_ROOT_KEY_PATH!,
                    '-set_serial',
                    '0x' + serial.toString('hex'),
                    '-out',
                    certPath,
                    '-days',
                    '365',
                    '-sha256',
                    '-extfile',
                    confPath,
                    '-extensions',
                    'v3_req',
                ],
                { stdio: 'ignore' },
            )
            const privateKey = readFileSync(keyPath, 'utf8')
            const artisanCert = readFileSync(certPath, 'utf8')
            return {
                privateKey,
                certificateChain: artisanCert + '\n' + rootCert,
                expiresAt: new Date(new crypto.X509Certificate(artisanCert).validTo),
            }
        } finally {
            rmSync(tempDir, { recursive: true, force: true })
        }
    }

    /**
     * Internal helper to unwrap vault and decrypt the artisan credentials on the server
     */
    private static async getDecryptedArtisanCredentials(
        userId: string,
    ): Promise<{ privateKey: string; certificate: string }> {
        const privateKeyPem = await UserSecretsService.getDecryptedSecret(userId, 'C2PA_PRIV')
        const certificatePem = await UserSecretsService.getDecryptedSecret(userId, 'C2PA_PUB')
        return { privateKey: privateKeyPem, certificate: certificatePem }
    }

    /**
     * Helper method to determine the C2PA state of a media file/asset buffer.
     * Returns one of:
     * - 'none': No C2PA manifest found.
     * - 'invalid': C2PA manifest exists but could not be parsed/verified successfully.
     * - 'valid': Valid C2PA manifest found, but does not belong to the target user.
     * - 'owned': Valid C2PA manifest found, and the creator matches the target user.
     */
    static async getC2PAState(mediaBuffer: Buffer, targetUserId?: string): Promise<C2PAState> {
        try {
            const inspect = await C2PAService.inspectManifest(mediaBuffer)

            if (!inspect.hasManifest) {
                return 'none'
            }

            if (!inspect.authentic) {
                return 'invalid'
            }

            let userId = targetUserId
            if (!userId) {
                const { auth } = await import('@/lib/auth')
                const session = await auth()
                userId = session?.user?.id
            }

            if (userId && inspect.creatorUserId && inspect.creatorUserId === userId) {
                return 'owned'
            }

            return 'valid'
        } catch (err) {
            return 'invalid'
        }
    }
}
