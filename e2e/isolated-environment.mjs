import { readFileSync } from 'node:fs'
import { parse } from 'dotenv'

export const baseURL = 'http://localhost:20200'

/**
 * Refuse to start the browser tests against development or production data.
 * @returns {Record<string, string>}
 */
export function isolatedEnvironment() {
    const values = parse(readFileSync('.env.test.local'))
    if (values.NODE_ENV !== 'development') {
        throw new Error('Browser tests require NODE_ENV=development in .env.test.local')
    }
    for (const key of ['DATABASE_URL', 'DATABASE_URL_APP']) {
        const url = new URL(values[key])
        if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
            url.pathname !== '/crafts_test') {
            throw new Error('Browser tests require the local crafts_test database')
        }
    }
    return {
        ...values,
        NODE_ENV: 'development',
        PORT: '20200',
        AUTH_URL: baseURL,
        NEXT_PUBLIC_SERVER_URL: baseURL,
        // Tests use synthetic local fixtures and never call external providers.
        GROQ_API_KEY: '',
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: '',
        AUTH_GOOGLE_ID: '',
        AUTH_GOOGLE_SECRET: '',
    }
}
