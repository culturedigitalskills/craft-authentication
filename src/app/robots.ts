import type { MetadataRoute } from 'next'
import { seoOrigin } from '@/i8n/seo'

// Resolve the public origin from runtime deployment settings, not build placeholders.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: '*', allow: '/', disallow: '/api/' },
        sitemap: seoOrigin() + '/sitemap.xml',
    }
}
