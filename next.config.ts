import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i8n/requests.tsx')
const nextConfig: NextConfig = {
    output: 'standalone',
    experimental: {
        serverActions: {
            bodySizeLimit: '110mb',
        },
        // Must accommodate the 100 MB video limit (MAX_VIDEO_MB in
        // src/lib/media-limits.ts) plus multipart overhead — uploads go
        // through the proxy layer.
        proxyClientMaxBodySize: '110mb',
    },
    // Keep these as external packages so Next.js does not bundle them into the
    // server chunk. This ensures they are traced into the standalone node_modules
    // and remain resolvable by other scripts in the container (e.g. seed.mjs).
    serverExternalPackages: [
        '@prisma/client',
        '@prisma/adapter-pg',
        'pg',
        '@contentauth/c2pa-node',
        // Must resolve its bundled ffmpeg binary via a real __dirname at runtime;
        // bundling it rewrites the path to a virtual /ROOT/ location.
        'ffmpeg-static',
    ],
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
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'X-DNS-Prefetch-Control', value: 'on' },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                ],
            },
        ]
    },
}

export default withNextIntl(nextConfig)
