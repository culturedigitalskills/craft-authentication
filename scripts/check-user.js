const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const dbUrl = process.env.DATABASE_URL_APP || process.env.DATABASE_URL
const pool = new Pool({ connectionString: dbUrl })
const prisma = new PrismaClient({
    adapter: new PrismaPg(pool)
})

async function main() {
    const email = 'f.online@ambertation.de';
    
    // Find the user
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            accounts: true
        }
    });
    
    if (user) {
        console.log(`User exists: ${JSON.stringify(user, null, 2)}`);
    } else {
        console.log(`User with email ${email} does not exist in the database.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
