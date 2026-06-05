const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const crypto = require('crypto')
const dotenv = require('dotenv')

// Load environment variables (defaults to .env.local)
const envFile = process.argv[2] || '.env.local'
dotenv.config({ path: envFile })

console.log(`Loading env from ${envFile}`)
const dbUrl = process.env.DATABASE_URL_APP || process.env.DATABASE_URL
console.log(`Using DB URL: ${dbUrl}`)

const pool = new Pool({ connectionString: dbUrl })
const prisma = new PrismaClient({
    adapter: new PrismaPg(pool)
})

async function main() {
    console.log('Starting password migration to Better Auth Account table...')
    
    // 1. Fetch all users who have a password
    const users = await prisma.user.findMany({
        where: {
            password: {
                not: null,
            },
        },
    })

    console.log(`Found ${users.length} users with passwords.`)

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
        // Check if a credential account already exists for this user
        const existingAccount = await prisma.account.findFirst({
            where: {
                userId: user.id,
                providerId: 'credential',
            },
        })

        if (!existingAccount) {
            // Create a credential account
            await prisma.account.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: user.id,
                    providerId: 'credential',
                    accountId: user.email.toLowerCase(),
                    password: user.password,
                },
            })
            migratedCount++
        } else {
            // Update password if it doesn't match
            if (existingAccount.password !== user.password) {
                await prisma.account.update({
                    where: { id: existingAccount.id },
                    data: { password: user.password },
                })
                migratedCount++
            } else {
                skippedCount++
            }
        }
    }

    console.log(`Migration complete! Migrated/Updated: ${migratedCount}, Skipped: ${skippedCount}`)
}

main()
    .catch((e) => {
        console.error('Migration error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
