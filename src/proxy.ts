import { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i8n/routing'
import { auth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rate-limiter'

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing)

const isDev = process.env.NODE_ENV === 'development'

/**
 * Generate a Content-Security-Policy header with a per-request nonce.
 * In development, Turbopack requires eval() for HMR so we relax script-src.
 * In production, strict nonce-based CSP is enforced.
 */
function generateCsp(nonce: string) {
    return [
        "default-src 'self'",
        isDev
            ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
            : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' blob: data: https://*.wikimedia.org https://img.youtube.com",
        "font-src 'self' https://fonts.gstatic.com",
        isDev
            ? "connect-src 'self' ws://localhost:*"
            : "connect-src 'self'",
        "media-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-src 'self' https://www.youtube.com https://www.openstreetmap.org",
        "frame-ancestors 'none'",
        isDev ? '' : 'upgrade-insecure-requests',
    ].filter(Boolean).join('; ')
}

/**
 * Combined proxy with:
 * - Rate limiting for API routes
 * - CSP headers for page routes
 * - Internationalization for all other routes
 */
export default async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Apply rate limiting only to API routes
    if (pathname.startsWith('/api/')) {
        const session = await auth()
        return applyRateLimit(request, session, pathname)
    }

    // For non-API routes, apply next-intl middleware then add CSP
    const response = intlMiddleware(request)

    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
    response.headers.set('x-nonce', nonce)
    response.headers.set('Content-Security-Policy', generateCsp(nonce))

    return response
}

export const config = {
    matcher: [
        // Match all API routes for rate limiting
        '/api/:path*',
        // Match all pathnames for intl except API, _next, _vercel, and files with dots
        '/((?!api|_next|_vercel|.*\\..*).*)',
        // Match all pathnames within /users, optionally with locale prefix
        '/([\\w-]+)?/users/(.+)',
    ],
}
