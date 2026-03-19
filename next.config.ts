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
        {
            protocol: 'http',
            hostname: 'localhost',
            port: '20100',
            pathname: '/api/media/**',
        },        
        
        ],
    }    
}

export default withNextIntl(nextConfig);

