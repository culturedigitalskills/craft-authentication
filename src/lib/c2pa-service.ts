import 'server-only'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { KMS } from '@/lib/kms'
import { getC2PARootKeys, getC2PATrustList } from '@/lib/c2pa-config'
import { UserSecretsService } from '@/lib/user-secrets-service'
import {
    Reader,
    Builder,
    LocalSigner,
    createTrustSettings,
    createVerifySettings,
    mergeSettings,
    settingsToJson,
} from '@contentauth/c2pa-node'
import type { C2PAState } from '@/types/c2pa'

const secretsDir = join(process.cwd(), 'secrets')

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
     * Checks if the user's certificate expires in the next 30 days.
     * If yes, and auto-renew is enabled, performs automatic renewal.
     */
    static async checkAndAutoRenew(userId: string): Promise<void> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { c2paAutoRenew: true, c2paCertExpiresAt: true },
        })

        if (!user || !user.c2paCertExpiresAt || !user.c2paAutoRenew) return

        const daysRemaining =
            (user.c2paCertExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        if (daysRemaining > 30) return // Not in expiration window

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
            console.error('Failed auto-renewing C2PA certificate:', error)
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
        const signer = LocalSigner.newSigner(
            certChain,
            leafKey,
            'es256',
            'http://timestamp.digicert.com',
        )

        const createdAction: any = {
            action: 'c2pa.created',
            softwareAgent: 'Crafts Registry v1',
            timestamp: new Date().toISOString(),
        }

        if (generationMetadata) {
            createdAction.digitalSourceType =
                'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'
            createdAction.parameters = {
                description: `AI generated via ${generationMetadata.service} using model ${generationMetadata.model}`,
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

        const builder = Builder.withJson(manifestDefinition)
        const input = { buffer: mediaBuffer, mimeType }
        const output: { buffer: Buffer | null } = { buffer: null }

        builder.sign(signer, input, output)

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
        const signer = LocalSigner.newSigner(
            certChain,
            leafKey,
            'es256',
            'http://timestamp.digicert.com',
        )

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
                                action: 'c2pa.created',
                                digitalSourceType:
                                    'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
                                softwareAgent: 'Crafts Registry v1',
                                timestamp: new Date().toISOString(),
                                parameters: {
                                    description: `AI generated via ${commissionDetails.service} using model ${commissionDetails.model}`,
                                    ...commissionDetails,
                                },
                            },
                        ],
                    },
                },
            ],
        }

        const builder = Builder.withJson(manifestDefinition)

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

        builder.sign(signer, input, output)

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
        const signer = LocalSigner.newSigner(
            certChain,
            leafKey,
            'es256',
            'http://timestamp.digicert.com',
        )

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

        const builder = Builder.withJson(manifestDefinition)
        builder.setIntent('edit')
        const parentJson = {
            title: 'Parent Image',
            format: mimeType,
            relationship: 'parentOf',
        }
        await builder.addIngredient(JSON.stringify(parentJson), { buffer: mediaBuffer, mimeType })

        const input = { buffer: mediaBuffer, mimeType }
        const output = { buffer: null }

        builder.sign(signer, input, output)

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

            // Extract creatorUserId from leaf certificate subjectAltName (urn:uuid)
            // The certificate is embedded in the binary block in DER format, containing the ASCII substring "urn:uuid:<UUID>"
            const bufferStr = mediaBuffer.toString('binary')
            const uuidMatch = bufferStr.match(/urn:uuid:([0-9a-fA-F-]{36})/)
            const creatorUserId = uuidMatch ? uuidMatch[1] : undefined

            let date: string | null = activeManifest.signature_info?.time || null

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

                const signerName =
                    manifest.signature_info?.common_name || 'Unknown'
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
                            description:
                                act.description || act.parameters?.description || null,
                            softwareAgent: act.softwareAgent || signerName,
                            timestamp: act.timestamp || signerTime,
                            parameters: act.parameters || null,
                            digitalSourceType: act.digitalSourceType || null,
                            signer: signerName,
                            issuer: signerIssuer,
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
        const tempDir = secretsDir
        const prefix = `artisan-${userId}`

        const keyPath = join(tempDir, `${prefix}_key.pem`)
        const csrPath = join(tempDir, `${prefix}_csr.pem`)
        const certPath = join(tempDir, `${prefix}_cert.pem`)
        const confPath = join(tempDir, `${prefix}_openssl.cnf`)

        try {
            const { certificate: rootCert } = getC2PARootKeys()
            const rootCertPath = process.env.C2PA_ROOT_CERT_PATH!
            const rootKeyPath = process.env.C2PA_ROOT_KEY_PATH!

            // Create config with SAN URI extension (W3C/DID standard) and required C2PA extensions
            const cnfContent = `
[ req ]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[ req_distinguished_name ]
C = US
O = Sustainable Crafting Registry
CN = ${artisanName}

[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature
extendedKeyUsage = emailProtection, 1.3.6.1.5.5.7.3.36
subjectAltName = URI:urn:uuid:${userId}
`
            writeFileSync(confPath, cnfContent.trim(), 'utf8')

            // 1. Generate EC key pair and CSR
            execSync(
                `openssl req -new -nodes -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 ` +
                    `-keyout "${keyPath}" -out "${csrPath}" -config "${confPath}"`,
                { stdio: 'ignore' },
            )

            // 2. Sign the CSR with CA Root certificate (expires in 365 days)
            execSync(
                `openssl x509 -req -in "${csrPath}" -CA "${rootCertPath}" ` +
                    `-CAkey "${rootKeyPath}" -CAcreateserial ` +
                    `-out "${certPath}" -days 365 -sha256 -extfile "${confPath}" -extensions v3_req`,
                { stdio: 'ignore' },
            )

            const privateKey = execSync(`cat "${keyPath}"`, { encoding: 'utf8' })
            const artisanCert = execSync(`cat "${certPath}"`, { encoding: 'utf8' })

            // Build chain (Artisan Cert + Root CA Cert)
            const certificateChain = artisanCert + '\n' + rootCert
            const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

            return { privateKey, certificateChain, expiresAt }
        } finally {
            // Clean up temporary files
            if (existsSync(keyPath)) unlinkSync(keyPath)
            if (existsSync(csrPath)) unlinkSync(csrPath)
            if (existsSync(certPath)) unlinkSync(certPath)
            if (existsSync(confPath)) unlinkSync(confPath)
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

            if (
                userId &&
                inspect.creatorUserId &&
                inspect.creatorUserId.trim().toLowerCase() === userId.trim().toLowerCase()
            ) {
                return 'owned'
            }

            return 'valid'
        } catch (err) {
            return 'invalid'
        }
    }
}
