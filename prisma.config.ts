import { config } from 'dotenv'

// Load environment variables
config()

console.log(
    'Using database URL:',
    process.env.NODE_ENV,
    process.env.NODE_ENV === 'production' ? process.env.DATABASE_URL : process.env.DATABASE_URL_APP,
)

export default {
    datasource: {
        url:
            process.env.NODE_ENV === 'production'
                ? process.env.DATABASE_URL
                : process.env.DATABASE_URL_APP,
    },
}
