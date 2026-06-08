/**
 * Generates an RSA-4096 key pair for MockLocalKMS and writes the PEM files to ./secrets/.
 * Run once before first launch:
 *
 *   node scripts/generate-kms-keys.mjs
 *
 * In production, replace MockLocalKMS with a real KMS (OpenBao, Scaleway, OVHcloud, etc.)
 * and discard these files.
 */

import { generateKeyPairSync, randomBytes } from 'crypto'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const secretsDir = join(__dirname, '..', 'secrets')

if (!existsSync(secretsDir)) {
    mkdirSync(secretsDir, { mode: 0o700 })
}

const privateKeyPath = join(secretsDir, 'kms_private_key.pem')
const publicKeyPath = join(secretsDir, 'kms_public_key.pem')

if (existsSync(privateKeyPath) || existsSync(publicKeyPath)) {
    console.error('ERROR: KMS key files already exist in ./secrets/')
    console.error('  kms_private_key.pem and/or kms_public_key.pem are present.')
    console.error('  Delete them manually if you intentionally want to rotate the KMS key pair.')
    console.error('  WARNING: Rotating the KMS key pair invalidates all existing SSE_KMS vault records.')
    process.exit(1)
}

console.log('Generating RSA-4096 key pair for MockLocalKMS...')
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

writeFileSync(privateKeyPath, privateKey, { mode: 0o600 })
writeFileSync(publicKeyPath, publicKey, { mode: 0o644 })

const localMasterKey = randomBytes(32).toString('hex')
const vaultServerSecret = randomBytes(32).toString('base64')

console.log('')
console.log('KMS key pair written to:')
console.log(`  ${privateKeyPath}`)
console.log(`  ${publicKeyPath}`)
console.log('')
console.log('Add these lines to your .env.local:')
console.log('')
console.log(`KMS_PRIVATE_KEY_PATH=./secrets/kms_private_key.pem`)
console.log(`KMS_PUBLIC_KEY_PATH=./secrets/kms_public_key.pem`)
console.log(`LOCAL_MASTER_KEY=${localMasterKey}`)
console.log(`VAULT_SERVER_SECRET=${vaultServerSecret}`)
console.log('')
console.log('Keep kms_private_key.pem out of version control. It is already in .gitignore.')
