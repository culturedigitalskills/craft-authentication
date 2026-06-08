/**
 * Generates or renews an ECDSA P-256 (prime256v1) self-signed Root CA certificate
 * for signing Artisan C2PA credentials. The files are written to ./secrets/.
 *
 * If a private key already exists, it renews the certificate using the existing key.
 * 
 * This script is interactive and prompts the user for certificate details (Common Name,
 * Organization, Country) when creating/renewing.
 *
 * Usage:
 *   node scripts/generate-c2pa-root.mjs
 */

import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import readline from 'readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const secretsDir = join(__dirname, '..', 'secrets')

// Ensure secrets directory exists
if (!existsSync(secretsDir)) {
    mkdirSync(secretsDir, { mode: 0o700 })
}

const rootKeyPath = join(secretsDir, 'c2pa_root_key.pem')
const rootCertPath = join(secretsDir, 'c2pa_root_cert.pem')

// Check if openssl is available in the system
try {
    execSync('openssl version', { stdio: 'ignore' })
} catch {
    console.error('ERROR: OpenSSL command-line tool was not found in your system path.')
    console.error('Please install OpenSSL or ensure it is in your PATH to run this script.')
    process.exit(1)
}

const hasKey = existsSync(rootKeyPath)
const hasCert = existsSync(rootCertPath)

// If only certificate exists but private key is missing, we cannot renew
if (!hasKey && hasCert) {
    console.error('ERROR: C2PA Root CA certificate exists but the private key is missing.')
    console.error(`  Expected private key at: ${rootKeyPath}`)
    console.error('  Cannot renew certificate without the private key. Please delete the certificate file and run again to create a new Root CA.')
    process.exit(1)
}

// Prompt helper
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => rl.question(query, (ans) => {
        rl.close();
        resolve(ans);
    }));
}

async function main() {
    let defaultCountry = 'US'
    let defaultOrg = 'Sustainable Crafting Registry'
    let defaultCN = 'Crafts C2PA Root CA'

    // Try to extract existing certificate details to use as defaults for renewal
    if (hasCert) {
        try {
            const subjectStr = execSync(`openssl x509 -subject -noout -in "${rootCertPath}"`, { encoding: 'utf8' })
            
            // Format can be: subject=C = US, O = Sustainable Crafting Registry, CN = Crafts C2PA Root CA
            // or subject= /C=US/O=Sustainable Crafting Registry/CN=Crafts C2PA Root CA
            const cMatch = subjectStr.match(/\/C=([^/]+)/) || subjectStr.match(/C\s*=\s*([^,]+)/) || subjectStr.match(/countryName\s*=\s*([^,]+)/)
            const oMatch = subjectStr.match(/\/O=([^/]+)/) || subjectStr.match(/O\s*=\s*([^,]+)/) || subjectStr.match(/organizationName\s*=\s*([^,]+)/)
            const cnMatch = subjectStr.match(/\/CN=([^/]+)/) || subjectStr.match(/CN\s*=\s*([^,\n]+)/) || subjectStr.match(/commonName\s*=\s*([^,\n]+)/)

            if (cMatch) defaultCountry = cMatch[1].trim()
            if (oMatch) defaultOrg = oMatch[1].trim()
            if (cnMatch) defaultCN = cnMatch[1].trim()
        } catch (e) {
            // Ignore extraction errors and fallback to hardcoded defaults
        }
    }

    let country = defaultCountry
    let org = defaultOrg
    let commonName = defaultCN

    // Only prompt if run in an interactive terminal (TTY)
    const isInteractive = process.stdin.isTTY
    if (isInteractive) {
        console.log('--- Certificate Details Configuration ---')
        console.log('Press Enter to accept the default values in brackets.')
        console.log('')
        
        country = (await askQuestion(`Country Code (2 letters) [${defaultCountry}]: `)).trim() || defaultCountry
        org = (await askQuestion(`Organization Name [${defaultOrg}]: `)).trim() || defaultOrg
        commonName = (await askQuestion(`Common Name (CN) [${defaultCN}]: `)).trim() || defaultCN
        console.log('')
    } else {
        console.log('Non-interactive terminal detected. Using certificate defaults:')
        console.log(`  Country: ${country}`)
        console.log(`  Organization: ${org}`)
        console.log(`  Common Name: ${commonName}`)
        console.log('')
    }

    // We use a temporary config file to ensure X.509 extensions (CA:true) are correctly set,
    // which is required for a Root CA certificate and works across different OpenSSL versions.
    const tempConfigPath = join(secretsDir, 'temp_openssl.cnf')
    const configContent = `
[ req ]
distinguished_name = req_distinguished_name
prompt = no
x509_extensions = v3_ca

[ req_distinguished_name ]
C = ${country}
O = ${org}
CN = ${commonName}

[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, keyCertSign, cRLSign
`

    try {
        writeFileSync(tempConfigPath, configContent.trim(), 'utf8')

        if (hasKey) {
            console.log('C2PA Root CA private key already exists. Renewing the certificate using the existing private key...')
            
            // Renew/generate cert using the existing private key (maintaining trust for already signed certificates)
            execSync(
                `openssl req -x509 -new -nodes -key "${rootKeyPath}" ` +
                `-out "${rootCertPath}" -days 825 -config "${tempConfigPath}"`,
                { stdio: 'inherit' }
            )
            
            console.log('')
            console.log('Success! C2PA Root CA certificate renewed successfully (825 days validity):')
            console.log(`  Private Key (kept): ${rootKeyPath}`)
            console.log(`  Certificate (renewed): ${rootCertPath}`)
        } else {
            console.log('Generating new self-signed C2PA Root CA key and certificate (825 days validity)...')
            
            // Generate a new EC key pair and self-signed certificate
            execSync(
                `openssl req -x509 -new -nodes -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 ` +
                `-keyout "${rootKeyPath}" -out "${rootCertPath}" -days 825 -config "${tempConfigPath}"`,
                { stdio: 'inherit' }
            )

            console.log('')
            console.log('Success! C2PA Root CA generated successfully (825 days validity):')
            console.log(`  Private Key: ${rootKeyPath}`)
            console.log(`  Certificate: ${rootCertPath}`)
        }

        console.log('')
        console.log('Make sure to add these to your .env.local configuration:')
        console.log(`  C2PA_ROOT_KEY_PATH=./secrets/c2pa_root_key.pem`)
        console.log(`  C2PA_ROOT_CERT_PATH=./secrets/c2pa_root_cert.pem`)
        console.log('')
        console.log('Please keep c2pa_root_key.pem safe and do not commit it to version control.')

    } catch (error) {
        console.error('An error occurred during certificate operation:', error)
    } finally {
        // Clean up temporary config file
        if (existsSync(tempConfigPath)) {
            try {
                unlinkSync(tempConfigPath)
            } catch (err) {
                console.error('Failed to clean up temporary config file:', err)
            }
        }
    }
}

main()
