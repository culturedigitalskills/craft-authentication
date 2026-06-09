/**
 * Re-wraps all SSE_KMS vault records when LOCAL_MASTER_KEY is being rotated.
 *
 * When to run:
 *   - Before changing LOCAL_MASTER_KEY in .env (or .env.production).
 *   - After a suspected LOCAL_MASTER_KEY compromise.
 *
 * Note on RSA key pair rotation (kms_private_key.pem / kms_public_key.pem):
 *   Those files are only used transiently during vault initialisation — the stored
 *   SSE_KMS records are AES-256-GCM encrypted with LOCAL_MASTER_KEY, not with the
 *   RSA key. Rotating the RSA key pair requires no database migration; just replace
 *   the PEM files in ./secrets/ and restart the server.
 *
 * Usage:
 *   pnpm dotenv -e .env.local -- node scripts/rotate-kms-master-key.mjs \
 *     --old-key=<current-64-char-hex> \
 *     --new-key=<new-64-char-hex>
 *
 * Generate a new key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Steps:
 *   1. Generate a new LOCAL_MASTER_KEY (command above).
 *   2. Run this script with the current (old) key and the new key.
 *   3. Only after the script reports "All records re-wrapped successfully":
 *      update LOCAL_MASTER_KEY in .env and restart the server.
 *   4. Do NOT restart the server before the script succeeds — the old key is
 *      still needed to decrypt existing records during the migration.
 */

import { createDecipheriv, createCipheriv, randomBytes } from 'crypto'
import { parseArgs } from 'util'

const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        'old-key': { type: 'string' },
        'new-key': { type: 'string' },
    },
})

const oldKeyHex = values['old-key']
const newKeyHex = values['new-key']

if (!oldKeyHex || !newKeyHex) {
    console.error('Usage: node scripts/rotate-kms-master-key.mjs --old-key=<hex> --new-key=<hex>')
    process.exit(1)
}

if (!/^[0-9a-fA-F]{64}$/.test(oldKeyHex) || !/^[0-9a-fA-F]{64}$/.test(newKeyHex)) {
    console.error('Both keys must be 64-character hex strings (256-bit / 32 bytes).')
    process.exit(1)
}

if (oldKeyHex === newKeyHex) {
    console.error('Old and new keys are identical — nothing to rotate.')
    process.exit(1)
}

const oldKey = Buffer.from(oldKeyHex, 'hex')
const newKey = Buffer.from(newKeyHex, 'hex')

function unwrapAesGcm(wrappedKeyJson, key) {
    const { ciphertext, iv } = JSON.parse(wrappedKeyJson)
    const combined = Buffer.from(ciphertext, 'base64')
    if (combined.length < 16) throw new Error('Ciphertext too short')

    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
    decipher.setAuthTag(combined.subarray(combined.length - 16))
    return Buffer.concat([
        decipher.update(combined.subarray(0, combined.length - 16)),
        decipher.final(),
    ])
}

function wrapAesGcm(rawBytes, key) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(rawBytes), cipher.final()])
    const tag = cipher.getAuthTag()
    return JSON.stringify({
        ciphertext: Buffer.concat([encrypted, tag]).toString('base64'),
        iv: iv.toString('base64'),
    })
}

// Dynamic import of Prisma so the script works without transpilation
const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()

async function run() {
    const records = await prisma.userWrappedVaultKeys.findMany({
        where: { wrapMode: 'SSE_KMS' },
        select: { id: true, wrappedKey: true },
    })

    if (records.length === 0) {
        console.log('No SSE_KMS records found — nothing to re-wrap.')
        return
    }

    console.log(`Re-wrapping ${records.length} SSE_KMS record(s)...`)

    let failed = 0

    for (const record of records) {
        try {
            const rawKey = unwrapAesGcm(record.wrappedKey, oldKey)
            const newWrappedKey = wrapAesGcm(rawKey, newKey)
            rawKey.fill(0)

            await prisma.userWrappedVaultKeys.update({
                where: { id: record.id },
                data: { wrappedKey: newWrappedKey },
            })

            console.log(`  ✓ ${record.id}`)
        } catch (err) {
            console.error(`  ✗ ${record.id}: ${err.message}`)
            failed++
        }
    }

    if (failed > 0) {
        console.error(`\n${failed} record(s) failed. Do NOT update LOCAL_MASTER_KEY until all records succeed.`)
        process.exit(1)
    }

    console.log(`\nAll records re-wrapped successfully.`)
    console.log('You can now update LOCAL_MASTER_KEY in .env and restart the server.')
}

run()
    .catch((err) => { console.error(err); process.exit(1) })
    .finally(() => prisma.$disconnect())
