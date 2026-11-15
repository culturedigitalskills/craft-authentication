import type { MetadataRoute } from 'next'
import { seoOrigin } from '@/i8n/seo'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: '*', allow: '/', disallow: '/api/' },
        sitemap: seoOrigin() + '/sitemap.xml',
    }
}
