import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL_APP })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const countriesWithRegions = [
    {
        isoCode: 'MA',
        name: 'Morocco',
        regions: [
            { name: 'Fès-Meknès', regionType: 'Region' },
            { name: 'Marrakech-Safi', regionType: 'Region' },
            { name: 'Casablanca-Settat', regionType: 'Region' },
            { name: 'Rabat-Salé-Kénitra', regionType: 'Region' },
            { name: 'Tanger-Tétouan-Al Hoceïma', regionType: 'Region' },
            { name: 'Souss-Massa', regionType: 'Region' },
            { name: 'Drâa-Tafilalet', regionType: 'Region' },
            { name: 'Béni Mellal-Khénifra', regionType: 'Region' },
            { name: 'Oriental', regionType: 'Region' },
        ],
    },
    {
        isoCode: 'IN',
        name: 'India',
        regions: [
            { name: 'Rajasthan', regionType: 'State' },
            { name: 'Gujarat', regionType: 'State' },
            { name: 'Uttar Pradesh', regionType: 'State' },
            { name: 'West Bengal', regionType: 'State' },
            { name: 'Tamil Nadu', regionType: 'State' },
            { name: 'Kerala', regionType: 'State' },
            { name: 'Madhya Pradesh', regionType: 'State' },
            { name: 'Kashmir', regionType: 'State' },
            { name: 'Karnataka', regionType: 'State' },
            { name: 'Andhra Pradesh', regionType: 'State' },
        ],
    },
    {
        isoCode: 'MX',
        name: 'Mexico',
        regions: [
            { name: 'Oaxaca', regionType: 'State' },
            { name: 'Chiapas', regionType: 'State' },
            { name: 'Puebla', regionType: 'State' },
            { name: 'Jalisco', regionType: 'State' },
            { name: 'Guerrero', regionType: 'State' },
            { name: 'Michoacán', regionType: 'State' },
            { name: 'Guanajuato', regionType: 'State' },
        ],
    },
    {
        isoCode: 'TR',
        name: 'Turkey',
        regions: [
            { name: 'Cappadocia', regionType: 'Region' },
            { name: 'Aegean', regionType: 'Region' },
            { name: 'Southeastern Anatolia', regionType: 'Region' },
            { name: 'Central Anatolia', regionType: 'Region' },
            { name: 'Istanbul', regionType: 'Province' },
        ],
    },
    {
        isoCode: 'PE',
        name: 'Peru',
        regions: [
            { name: 'Cusco', regionType: 'Region' },
            { name: 'Puno', regionType: 'Region' },
            { name: 'Ayacucho', regionType: 'Region' },
            { name: 'Junín', regionType: 'Region' },
            { name: 'Lima', regionType: 'Region' },
        ],
    },
    {
        isoCode: 'JP',
        name: 'Japan',
        regions: [
            { name: 'Kyoto', regionType: 'Prefecture' },
            { name: 'Ishikawa', regionType: 'Prefecture' },
            { name: 'Aichi', regionType: 'Prefecture' },
            { name: 'Niigata', regionType: 'Prefecture' },
            { name: 'Gifu', regionType: 'Prefecture' },
            { name: 'Okinawa', regionType: 'Prefecture' },
        ],
    },
    {
        isoCode: 'GH',
        name: 'Ghana',
        regions: [
            { name: 'Ashanti', regionType: 'Region' },
            { name: 'Greater Accra', regionType: 'Region' },
            { name: 'Northern', regionType: 'Region' },
            { name: 'Volta', regionType: 'Region' },
            { name: 'Upper East', regionType: 'Region' },
        ],
    },
    {
        isoCode: 'ET',
        name: 'Ethiopia',
        regions: [
            { name: 'Addis Ababa', regionType: 'City' },
            { name: 'Amhara', regionType: 'Region' },
            { name: 'Oromia', regionType: 'Region' },
            { name: 'Tigray', regionType: 'Region' },
            { name: 'SNNPR', regionType: 'Region' },
        ],
    },
    {
        isoCode: 'IT',
        name: 'Italy',
        regions: [
            { name: 'Tuscany', regionType: 'Region' },
            { name: 'Veneto', regionType: 'Region' },
            { name: 'Sicily', regionType: 'Region' },
            { name: 'Lombardy', regionType: 'Region' },
            { name: 'Sardinia', regionType: 'Region' },
        ],
    },
    {
        isoCode: 'TH',
        name: 'Thailand',
        regions: [
            { name: 'Chiang Mai', regionType: 'Province' },
            { name: 'Bangkok', regionType: 'Province' },
            { name: 'Nakhon Ratchasima', regionType: 'Province' },
            { name: 'Chiang Rai', regionType: 'Province' },
        ],
    },
    {
        isoCode: 'CN',
        name: 'China',
        regions: [
            { name: 'Jingdezhen', regionType: 'City' },
            { name: 'Yunnan', regionType: 'Province' },
            { name: 'Guizhou', regionType: 'Province' },
            { name: 'Sichuan', regionType: 'Province' },
            { name: 'Xinjiang', regionType: 'Region' },
        ],
    },
    {
        isoCode: 'EG',
        name: 'Egypt',
        regions: [
            { name: 'Cairo', regionType: 'Governorate' },
            { name: 'Aswan', regionType: 'Governorate' },
            { name: 'Fayoum', regionType: 'Governorate' },
            { name: 'Sinai', regionType: 'Region' },
        ],
    },
    {
        isoCode: 'CO',
        name: 'Colombia',
        regions: [
            { name: 'Boyacá', regionType: 'Department' },
            { name: 'Nariño', regionType: 'Department' },
            { name: 'Antioquia', regionType: 'Department' },
            { name: 'Bogotá', regionType: 'District' },
        ],
    },
    {
        isoCode: 'NG',
        name: 'Nigeria',
        regions: [
            { name: 'Lagos', regionType: 'State' },
            { name: 'Kano', regionType: 'State' },
            { name: 'Oyo', regionType: 'State' },
            { name: 'Benue', regionType: 'State' },
        ],
    },
    {
        isoCode: 'ID',
        name: 'Indonesia',
        regions: [
            { name: 'Bali', regionType: 'Province' },
            { name: 'Java', regionType: 'Island' },
            { name: 'Sumatra', regionType: 'Island' },
            { name: 'Sulawesi', regionType: 'Island' },
        ],
    },
    {
        isoCode: 'DE',
        name: 'Germany',
        regions: [
            { name: 'Bavaria', regionType: 'State' },
            { name: 'Saxony', regionType: 'State' },
            { name: 'Black Forest', regionType: 'Region' },
            { name: 'Thuringia', regionType: 'State' },
        ],
    },
    {
        isoCode: 'ES',
        name: 'Spain',
        regions: [
            { name: 'Andalusia', regionType: 'Community' },
            { name: 'Catalonia', regionType: 'Community' },
            { name: 'Valencia', regionType: 'Community' },
            { name: 'Castile and León', regionType: 'Community' },
        ],
    },
    {
        isoCode: 'US',
        name: 'United States',
        regions: [
            { name: 'New Mexico', regionType: 'State' },
            { name: 'North Carolina', regionType: 'State' },
            { name: 'Vermont', regionType: 'State' },
            { name: 'Oregon', regionType: 'State' },
            { name: 'Kentucky', regionType: 'State' },
        ],
    },
    {
        isoCode: 'GB',
        name: 'United Kingdom',
        regions: [
            { name: 'England', regionType: 'Country' },
            { name: 'Scotland', regionType: 'Country' },
            { name: 'Wales', regionType: 'Country' },
            { name: 'Northern Ireland', regionType: 'Country' },
        ],
    },
    {
        isoCode: 'PH',
        name: 'Philippines',
        regions: [
            { name: 'Luzon', regionType: 'Island Group' },
            { name: 'Visayas', regionType: 'Island Group' },
            { name: 'Mindanao', regionType: 'Island Group' },
        ],
    },
]

async function main() {
    console.log('Seeding countries and regions...')

    for (const { isoCode, name, regions } of countriesWithRegions) {
        const country = await prisma.country.upsert({
            where: { isoCode },
            update: { name },
            create: { isoCode, name },
        })

        for (const region of regions) {
            const existing = await prisma.region.findFirst({
                where: { countryId: country.id, name: region.name },
            })
            if (!existing) {
                await prisma.region.create({
                    data: {
                        countryId: country.id,
                        name: region.name,
                        regionType: region.regionType,
                    },
                })
            }
        }

        console.log(`  ${name} (${isoCode}): ${regions.length} regions`)
    }

    console.log('Seeding complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
