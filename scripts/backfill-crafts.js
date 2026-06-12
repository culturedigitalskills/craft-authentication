#!/usr/bin/env node
/**
 * One-off, idempotent backfill: migrate legacy "craft" rows stored in the
 * generic DataRecord table into the first-class Craft model + MediaAttachment.
 *
 * - Reuses each DataRecord's id as the Craft id so existing QR codes and
 *   already-issued Verifiable Credentials keep resolving.
 * - Maps the client-supplied owner email (data.artisan) -> Artisan via User.email.
 *   Rows with no matching artisan are logged as orphans and skipped.
 * - Re-issues each craft's VC with the artisan SLUG as owner (no email PII).
 * - NON-DESTRUCTIVE: DataRecord rows are left intact for verification/rollback.
 *
 * Run with env loaded, e.g.:
 *   dotenv -e .env.local -- node scripts/backfill-crafts.js
 *
 * The VC signing below mirrors src/lib/did/vc.ts exactly — keep them in sync.
 */

const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

// Prisma 7 uses a driver adapter (see src/lib/prisma.ts). CLI scripts prefer
// DATABASE_URL (localhost), falling back to the app's DATABASE_URL_APP.
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_APP })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const colors = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', reset: '\x1b[0m' }
const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`)

const DOMAIN = process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://www.sustainablecrafting.org'
const DID_WEB = `did:web:${DOMAIN.replace(/^https?:\/\//, '')}`

function getPrivateKey() {
    const raw = process.env.VC_PRIVATE_KEY
    if (!raw) throw new Error('VC_PRIVATE_KEY env var is not set')
    return raw.replace(/\\n/g, '\n')
}

// Canonical JSON — sorts object keys recursively (matches vc.ts).
function canonicalize(data) {
    return JSON.stringify(data, (_, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value)
                .sort()
                .reduce((sorted, key) => {
                    sorted[key] = value[key]
                    return sorted
                }, {})
        }
        return value
    })
}

function signData(data, privateKey) {
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(data)
    sign.end()
    return sign.sign(privateKey, 'base64')
}

function buildCraftVC({ craftId, title, description, ownerSlug, createdAt, firstImageUrl }) {
    const privateKey = getPrivateKey()
    const subjectId = `${DOMAIN}/credentials/crafts/${craftId}`

    let imageHash
    if (firstImageUrl) {
        imageHash = crypto.createHash('sha256').update(firstImageUrl).digest('hex')
    }

    const credentialSubject = {
        id: subjectId,
        type: 'Craft',
        title,
        description,
        ownerId: ownerSlug,
        dateCreated: createdAt,
        ...(firstImageUrl && { imageUrl: firstImageUrl }),
        ...(imageHash && { imageHash }),
    }

    const now = new Date().toISOString()
    const unsignedCredential = {
        '@context': [
            'https://www.w3.org/ns/credentials/v2',
            'https://w3id.org/security/v2',
            {
                Craft: 'https://schema.org/Product',
                title: 'https://schema.org/name',
                description: 'https://schema.org/description',
                ownerId: 'https://schema.org/manufacturer',
                dateCreated: 'https://schema.org/dateCreated',
                imageUrl: 'https://schema.org/image',
                imageHash: 'https://schema.org/contentHash',
            },
        ],
        type: ['VerifiableCredential', 'CraftCredential'],
        issuer: { id: DID_WEB, name: 'Sustainable Crafting Registry' },
        credentialSubject,
        validFrom: now,
    }

    const signature = signData(canonicalize(unsignedCredential), privateKey)
    return {
        credentialId: subjectId,
        credentialSubject,
        validFrom: now,
        proof: {
            type: 'RsaSignature2017',
            created: now,
            verificationMethod: `${DID_WEB}#key-1`,
            proofPurpose: 'assertionMethod',
            signature,
        },
    }
}

function looksLikeCraft(data) {
    if (!data || typeof data !== 'object') return false
    return 'artisan' in data || 'mediaIds' in data || 'isPublic' in data
}

async function main() {
    log('\n=== Craft backfill: DataRecord -> Craft ===\n', 'green')

    const records = await prisma.dataRecord.findMany()
    let created = 0
    let skippedExisting = 0
    let skippedNonCraft = 0
    const orphans = []

    for (const record of records) {
        const data = record.data || {}
        if (!looksLikeCraft(data)) {
            skippedNonCraft++
            continue
        }

        // Idempotent: don't recreate.
        const existingCraft = await prisma.craft.findUnique({ where: { id: record.id } })
        if (existingCraft) {
            skippedExisting++
            continue
        }

        const email = typeof data.artisan === 'string' ? data.artisan : null
        const artisan = email
            ? await prisma.artisan.findFirst({
                  where: { user: { email } },
                  select: { id: true, slug: true },
              })
            : null

        if (!artisan) {
            orphans.push({ id: record.id, name: record.name, artisan: email })
            continue
        }

        const location = data.location && typeof data.location === 'object' ? data.location : null
        const createdAt = data.createdOn ? new Date(data.createdOn) : record.createdAt
        const updatedAt = data.updatedOn ? new Date(data.updatedOn) : record.updatedAt

        const craft = await prisma.craft.create({
            data: {
                id: record.id,
                artisanId: artisan.id,
                title: record.name,
                description: record.description ?? null,
                material: typeof data.material === 'string' ? data.material : null,
                isPublic: Boolean(data.isPublic),
                isSharedLocation: data.isSharedLocation === undefined ? true : Boolean(data.isSharedLocation),
                latitude: location && typeof location.lat === 'number' ? location.lat : null,
                longitude: location && typeof location.lng === 'number' ? location.lng : null,
                place: typeof data.place === 'string' ? data.place : null,
                videos: Array.isArray(data.videos) ? data.videos.filter(Boolean) : [],
                createdAt,
                updatedAt,
            },
        })

        // Media attachments — only for media files that actually exist.
        const rawMediaIds = Array.isArray(data.mediaIds) ? data.mediaIds.filter(Boolean) : []
        const uniqueMediaIds = [...new Set(rawMediaIds)]
        let firstMediaId = null
        if (uniqueMediaIds.length > 0) {
            const existingFiles = await prisma.mediaFile.findMany({
                where: { id: { in: uniqueMediaIds } },
                select: { id: true },
            })
            const presentIds = new Set(existingFiles.map(f => f.id))
            const orderedPresent = uniqueMediaIds.filter(id => presentIds.has(id))
            const missing = uniqueMediaIds.filter(id => !presentIds.has(id))
            if (missing.length > 0) {
                log(`  craft ${craft.id}: ${missing.length} missing media file(s) skipped`, 'yellow')
            }
            if (orderedPresent.length > 0) {
                await prisma.mediaAttachment.createMany({
                    data: orderedPresent.map((mediaId, i) => ({
                        mediaId,
                        entityType: 'Craft',
                        entityId: craft.id,
                        attachmentType: i === 0 ? 'HERO' : 'GALLERY',
                        isPrimary: i === 0,
                        displayOrder: i,
                    })),
                })
            }
            firstMediaId = orderedPresent[0] ?? null
        }

        // Re-issue the VC with the artisan slug as owner (no email).
        try {
            const firstImageUrl = firstMediaId
                ? `${process.env.AUTH_URL}/api/media/${firstMediaId}`
                : null
            const vc = buildCraftVC({
                craftId: craft.id,
                title: craft.title,
                description: craft.description ?? '',
                ownerSlug: artisan.slug,
                createdAt: craft.createdAt.toISOString(),
                firstImageUrl,
            })
            await prisma.verifiableCredential.upsert({
                where: { credentialId: vc.credentialId },
                create: {
                    credentialId: vc.credentialId,
                    issuerDid: DID_WEB,
                    holderDid: artisan.slug,
                    credentialType: 'CraftCredential',
                    credentialSubject: vc.credentialSubject,
                    proof: vc.proof,
                    issuanceDate: new Date(vc.validFrom),
                },
                update: {
                    holderDid: artisan.slug,
                    credentialSubject: vc.credentialSubject,
                    proof: vc.proof,
                    issuanceDate: new Date(vc.validFrom),
                },
            })
        } catch (vcError) {
            log(`  craft ${craft.id}: VC issuance failed — ${vcError.message}`, 'yellow')
        }

        created++
        log(`  + ${craft.id}  "${craft.title}"  (artisan ${artisan.slug})`, 'green')
    }

    log('\n=== Summary ===', 'green')
    log(`  crafts created:        ${created}`)
    log(`  already migrated:      ${skippedExisting}`)
    log(`  non-craft DataRecords: ${skippedNonCraft}`)
    log(`  orphans (no artisan):  ${orphans.length}`, orphans.length ? 'yellow' : 'reset')
    for (const o of orphans) {
        log(`    orphan: id=${o.id} name="${o.name}" artisan="${o.artisan}"`, 'yellow')
    }
    log('\nDataRecord rows were left intact (non-destructive).\n')
}

main()
    .catch(err => {
        log(`\nBackfill failed: ${err.stack || err.message}\n`, 'red')
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
