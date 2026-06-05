#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ANSI color codes
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m',
}

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
}

function exec(command, silent = false) {
    try {
        return execSync(command, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' })
    } catch (error) {
        if (!silent) throw error
        return null
    }
}

function loadEnv(envFile) {
    if (!fs.existsSync(envFile)) {
        log(`Error: ${envFile} not found`, 'red')
        process.exit(1)
    }

    const envContent = fs.readFileSync(envFile, 'utf-8')
    const env = {}

    envContent.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=')
            if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim()
            }
        }
    })

    return env
}

function updateEnvFile(envFile, updates) {
    let content = fs.readFileSync(envFile, 'utf-8')

    Object.entries(updates).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, 'm')
        if (regex.test(content)) {
            content = content.replace(regex, `${key}=${value}`)
        } else {
            content += `\n${key}=${value}`
        }
    })

    fs.writeFileSync(envFile, content)
}

async function initGarage() {
    const envFile = process.argv[2] || '.env.local'
    const containerPrefix = process.argv[3] || 'craft-authentication'

    log('=== Garage Initialization Script ===', 'green')
    log(`Environment: ${envFile}`)

    const env = loadEnv(envFile)
    const garageContainer = `${containerPrefix}-garage-1`

    // Check if garage container is running
    log('Checking if Garage container is running...', 'yellow')
    const runningContainers = exec('docker ps --format "{{.Names}}"', true)
    if (!runningContainers || !runningContainers.includes(garageContainer)) {
        log(`Error: Garage container '${garageContainer}' is not running`, 'red')
        log('Please start it first with: pnpm docker:up', 'yellow')
        process.exit(1)
    }
    log('✓ Container is running', 'green')

    // Get node ID
    log('Checking Garage cluster status...', 'yellow')
    const statusOutput = exec(`docker exec ${garageContainer} /garage status`, true)
    const nodeIdMatch = statusOutput.match(/([a-f0-9]{16})\s+\S+\s+[\d.:]+/)
    if (!nodeIdMatch) {
        log('Error: Could not get Garage node ID', 'red')
        process.exit(1)
    }
    const nodeId = nodeIdMatch[1]
    log(`Node ID: ${nodeId}`)

    // Check if node has a role assigned
    const hasNoRole = statusOutput.includes('NO ROLE ASSIGNED')
    if (hasNoRole) {
        log('Assigning storage capacity to node...', 'yellow')
        exec(`docker exec ${garageContainer} /garage layout assign ${nodeId} -z dc1 -c 1G`, true)
        exec(`docker exec ${garageContainer} /garage layout apply --version 1`, true)
        log('✓ Layout configured', 'green')
    } else {
        log('✓ Node already has a role assigned', 'green')
    }

    // Check if access key exists
    log('Checking access key...', 'yellow')
    const keyListOutput = exec(`docker exec ${garageContainer} /garage key list`, true)
    const keyExists = keyListOutput.includes(env.S3_ACCESS_KEY)

    let accessKeyId = env.S3_ACCESS_KEY
    let secretKey = env.S3_SECRET_KEY

    if (!keyExists || !accessKeyId.startsWith('GK')) {
        log('Creating new access key...', 'yellow')
        const keyName = env.S3_ACCESS_KEY.startsWith('GK') ? 'garage-dev-key' : env.S3_ACCESS_KEY
        const keyOutput = exec(`docker exec ${garageContainer} /garage key create ${keyName}`, true)

        const keyIdMatch = keyOutput.match(/Key ID:\s+(\S+)/)
        const secretMatch = keyOutput.match(/Secret key:\s+(\S+)/)

        if (keyIdMatch && secretMatch) {
            accessKeyId = keyIdMatch[1]
            secretKey = secretMatch[1]

            log('✓ Access key created', 'green')
            log('⚠ IMPORTANT: Updating your environment file...', 'yellow')
            log(`S3_ACCESS_KEY=${accessKeyId}`)
            log(`S3_SECRET_KEY=${secretKey}`)

            updateEnvFile(envFile, {
                S3_ACCESS_KEY: accessKeyId,
                S3_SECRET_KEY: secretKey,
            })

            log(`✓ ${envFile} has been updated`, 'green')
            log('⚠ Please restart your dev server to load new credentials', 'yellow')
        }
    } else {
        log('✓ Access key already exists', 'green')
    }

    // Check if bucket exists
    log('Checking bucket...', 'yellow')
    const bucketListOutput = exec(`docker exec ${garageContainer} /garage bucket list`, true)
    const bucketExists = bucketListOutput.includes(env.S3_BUCKET)

    if (!bucketExists) {
        log(`Creating bucket '${env.S3_BUCKET}'...`, 'yellow')
        exec(`docker exec ${garageContainer} /garage bucket create ${env.S3_BUCKET}`, true)
        log('✓ Bucket created', 'green')
    } else {
        log('✓ Bucket already exists', 'green')
    }

    // Check bucket permissions
    log('Checking bucket permissions...', 'yellow')
    const bucketInfoOutput = exec(
        `docker exec ${garageContainer} /garage bucket info ${env.S3_BUCKET}`,
        true,
    )
    const hasPermissions = bucketInfoOutput.includes(accessKeyId)

    if (!hasPermissions) {
        log('Granting read/write permissions...', 'yellow')
        exec(
            `docker exec ${garageContainer} /garage bucket allow --read --write ${env.S3_BUCKET} --key ${accessKeyId}`,
            true,
        )
        log('✓ Permissions granted', 'green')
    } else {
        log('✓ Permissions already configured', 'green')
    }

    log('\n=== Garage initialization complete! ===', 'green')
    log(`\nBucket: ${env.S3_BUCKET}`)
    log(`Access Key: ${accessKeyId}`)
    log(`Endpoint: ${env.S3_ENDPOINT}`)
}

// Run the script
initGarage().catch((error) => {
    log(`Error: ${error.message}`, 'red')
    process.exit(1)
})
