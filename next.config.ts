import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i8n/requests.tsx');
const nextConfig: NextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
        {
            protocol: 'https',
            hostname: '**.wikimedia.org',
            port: '',
            search: '',
        },
        ],
    }    
}

export default withNextIntl(nextConfig);

