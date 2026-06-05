#!/usr/bin/env node

/**
 * Garage initialization via Admin HTTP API (v2)
 *
 * Designed for Docker environments where `docker exec` is unavailable.
 * Uses Node 24's built-in fetch – no external dependencies required.
 *
 * First run:  creates layout, access key, bucket, and permissions.
 *             Logs the generated S3_ACCESS_KEY and S3_SECRET_KEY for the
 *             user to copy into .env.production.
 * Later runs: idempotent – skips what already exists.
 *
 * Environment variables:
 *   GARAGE_ADMIN_URL   – Admin API base URL  (default: http://garage:3903)
 *   GARAGE_ADMIN_TOKEN – Bearer token         (required)
 *   S3_BUCKET          – Bucket name          (required)
 *   S3_ACCESS_KEY      – If already set, key creation is skipped
 */

const GARAGE_ADMIN_URL = process.env.GARAGE_ADMIN_URL || 'http://garage:3903'
const GARAGE_ADMIN_TOKEN = process.env.GARAGE_ADMIN_TOKEN
const S3_BUCKET = process.env.S3_BUCKET
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY

// ── Helpers ──────────────────────────────────────────────────────────────

function log(msg, level = 'info') {
    const prefix = level === 'error' ? '\x1b[31m✗' : level === 'warn' ? '\x1b[33m!' : '\x1b[32m✓'
    console.log(`${prefix}\x1b[0m ${msg}`)
}

async function api(method, endpoint, body = null) {
    const url = `${GARAGE_ADMIN_URL}${endpoint}`
    const headers = {
        Authorization: `Bearer ${GARAGE_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
    }
    const opts = { method, headers }
    if (body) opts.body = JSON.stringify(body)

    const res = await fetch(url, opts)

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`${method} ${endpoint} → ${res.status}: ${text}`)
    }

    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json') ? res.json() : res.text()
}

async function waitForGarage(maxRetries = 60, intervalMs = 2000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const res = await fetch(`${GARAGE_ADMIN_URL}/v2/GetClusterStatus`, {
                headers: { Authorization: `Bearer ${GARAGE_ADMIN_TOKEN}` },
            })
            if (res.ok) return
        } catch (_) {
            /* not ready */
        }
        if (i > 0) console.log(`  Garage not ready, retrying (${i + 1}/${maxRetries})...`)
        await new Promise((r) => setTimeout(r, intervalMs))
    }
    throw new Error('Garage did not become ready in time')
}

// ── Main ─────────────────────────────────────────────────────────────────

async function initGarage() {
    if (!GARAGE_ADMIN_TOKEN) {
        log('GARAGE_ADMIN_TOKEN not set – skipping Garage init', 'warn')
        return
    }
    if (!S3_BUCKET) {
        log('S3_BUCKET not set – skipping Garage init', 'warn')
        return
    }

    console.log('\n=== Garage Initialization (Admin HTTP API) ===')

    // 1. Wait for Garage to be reachable
    console.log('Waiting for Garage...')
    await waitForGarage()
    log('Garage is reachable')

    // 2. Cluster layout
    console.log('Checking cluster layout...')
    const status = await api('GET', '/v2/GetClusterStatus')
    const layout = await api('GET', '/v2/GetClusterLayout')
    const hasRoles = Array.isArray(layout.roles) && layout.roles.length > 0

    if (!hasRoles && status.nodes && status.nodes.length > 0) {
        const nodeId = status.nodes[0].id
        console.log(`  Assigning storage to node ${nodeId.slice(0, 12)}...`)

        await api('POST', '/v2/UpdateClusterLayout', {
            roles: [
                {
                    id: nodeId,
                    zone: 'dc1',
                    capacity: 1000000000, // 1 GB
                    tags: [],
                },
            ],
        })

        const nextVersion = (layout.version || 0) + 1
        await api('POST', '/v2/ApplyClusterLayout', { version: nextVersion })
        log('Layout configured')
    } else {
        log('Layout already configured')
    }

    // 3. Access key – skip if user already has one configured
    const hasKey = S3_ACCESS_KEY && S3_ACCESS_KEY.startsWith('GK')
    let accessKeyId = hasKey ? S3_ACCESS_KEY : null

    if (!accessKeyId) {
        console.log('Checking access keys...')
        const keys = await api('GET', '/v2/ListKeys')

        if (keys.length === 0) {
            console.log('  Creating new access key...')
            const key = await api('POST', '/v2/CreateKey', {
                name: 'app-key',
                neverExpires: true,
            })
            accessKeyId = key.accessKeyId

            // Print credentials prominently for the user to copy
            console.log('')
            console.log('╔══════════════════════════════════════════════════════════╗')
            console.log('║  NEW GARAGE CREDENTIALS – copy these to .env.production  ║')
            console.log('╠══════════════════════════════════════════════════════════╣')
            console.log(`S3_ACCESS_KEY=${key.accessKeyId}`)
            console.log(`S3_SECRET_KEY=${key.secretAccessKey}`)
            console.log('╚══════════════════════════════════════════════════════════╝')
            console.log('')

            log('Access key created (update .env.production, then restart)')
        } else {
            accessKeyId = keys[0].id
            log(`Using existing key: ${accessKeyId}`)
        }
    } else {
        // Key configured in env, verify it exists by listing all keys
        console.log(`Checking configured key ${accessKeyId}...`)
        const keys = await api('GET', '/v2/ListKeys')
        const exists = keys.find((k) => k.id === accessKeyId || k.accessKeyId === accessKeyId)

        if (!exists) {
            // Key doesn't exist in Garage, create new one
            console.log('  Configured key not found in Garage, creating new one...')
            const key = await api('POST', '/v2/CreateKey', {
                name: 'app-key',
                neverExpires: true,
            })
            accessKeyId = key.accessKeyId

            console.log('')
            console.log('╔══════════════════════════════════════════════════════════╗')
            console.log('║  NEW GARAGE CREDENTIALS – copy these to .env.production ║')
            console.log('╠══════════════════════════════════════════════════════════╣')
            console.log(`║  S3_ACCESS_KEY=${key.accessKeyId}`)
            console.log(`║  S3_SECRET_KEY=${key.secretAccessKey}`)
            console.log('╚══════════════════════════════════════════════════════════╝')
            console.log('')

            log('New access key created (update .env.production, then restart)')
        } else {
            log(`Configured key exists: ${accessKeyId}`)
        }
    }

    // 4. Bucket
    console.log(`Checking bucket '${S3_BUCKET}'...`)
    const buckets = await api('GET', '/v2/ListBuckets')
    const existing = buckets.find((b) => b.globalAliases && b.globalAliases.includes(S3_BUCKET))
    let bucketId

    if (!existing) {
        console.log(`  Creating bucket '${S3_BUCKET}'...`)
        const bucket = await api('POST', '/v2/CreateBucket', {
            globalAlias: S3_BUCKET,
        })
        bucketId = bucket.id
        log(`Bucket created: ${bucketId}`)
    } else {
        bucketId = existing.id
        log(`Bucket exists: ${bucketId}`)
    }

    // 5. Permissions
    console.log('Ensuring bucket permissions...')
    await api('POST', '/v2/AllowBucketKey', {
        bucketId,
        accessKeyId,
        permissions: { read: true, write: true, owner: true },
    })
    log('Permissions configured')

    console.log('=== Garage initialization complete ===')
    console.log(`  Bucket:     ${S3_BUCKET}`)
    console.log(`  Access Key: ${accessKeyId}`)
    console.log(`  Endpoint:   ${process.env.S3_ENDPOINT || '(not set)'}`)
}

initGarage().catch((err) => {
    log(`Garage init error: ${err.message}`, 'error')
    process.exit(1)
})
