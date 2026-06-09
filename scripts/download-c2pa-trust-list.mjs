/**
 * Downloads the official C2PA content-signing trust list from the c2pa-org
 * conformance repository and saves it to secrets/c2pa-trust-list.pem.
 *
 * Run once during setup and whenever the trust list needs refreshing:
 *   node scripts/download-c2pa-trust-list.mjs
 *
 * The file is also expected to be present in Docker images via the mounted
 * secrets volume (same path as c2pa_root_cert.pem etc.).
 */

import { existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const TRUST_LIST_URL =
    'https://raw.githubusercontent.com/c2pa-org/conformance-public/main/trust-list/C2PA-TRUST-LIST.pem'

const __dirname = dirname(fileURLToPath(import.meta.url))
const secretsDir = join(__dirname, '..', 'secrets')
const destPath = join(secretsDir, 'c2pa-trust-list.pem')

if (!existsSync(secretsDir)) {
    console.error(`ERROR: secrets/ directory not found at: ${secretsDir}`)
    console.error('Create it first (e.g. "mkdir secrets") and ensure you have write access.')
    process.exit(1)
}

console.log(`Downloading C2PA trust list from:\n  ${TRUST_LIST_URL}\n`)

let pem
try {
    const res = await fetch(TRUST_LIST_URL)
    if (!res.ok) {
        console.error(`ERROR: HTTP ${res.status} ${res.statusText}`)
        process.exit(1)
    }
    pem = await res.text()
} catch (err) {
    console.error(`ERROR: Failed to fetch trust list: ${err.message}`)
    process.exit(1)
}

if (!pem.includes('-----BEGIN CERTIFICATE-----')) {
    console.error('ERROR: Downloaded content does not look like a PEM certificate bundle.')
    process.exit(1)
}

const certCount = (pem.match(/-----BEGIN CERTIFICATE-----/g) || []).length
writeFileSync(destPath, pem, 'utf8')

console.log(`Success! Saved ${certCount} certificates to:`)
console.log(`  ${destPath}`)
