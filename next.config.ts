import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i8n/requests.tsx');
const nextConfig: NextConfig = {
    output: 'standalone',
}


export default withNextIntl(nextConfig);

