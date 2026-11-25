import { NextRequest, NextResponse } from 'next/server'
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
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data: https://*.wikimedia.org",
        "font-src 'self'",
        isDev ? "connect-src 'self' ws://localhost:*" : "connect-src 'self'",
        "media-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-src 'self' https://www.youtube-nocookie.com https://www.openstreetmap.org",
        "frame-ancestors 'none'",
        isDev ? '' : 'upgrade-insecure-requests',
    ]
        .filter(Boolean)
        .join('; ')
}

/**
 * Combined proxy with:
 * - Rate limiting for API routes
 * - CSP headers for page routes
 * - Internationalization for all other routes
 */
export default async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    if (pathname === '/health') return NextResponse.next()
    if (pathname === '/_next/image') {
        // User uploads can be withdrawn or erased. Serve them through the media
        // access check on every request, including previously issued optimiser URLs.
        const src = request.nextUrl.searchParams.get('url')
        if (src) {
            let target: URL
            try { target = new URL(src, request.nextUrl.origin) }
            catch { return NextResponse.next() }
            if (target.pathname.startsWith('/api/media/') &&
                (target.origin === request.nextUrl.origin || target.origin === process.env.AUTH_URL ||
                 target.origin === 'http://localhost:20100')) {
                const destination = request.nextUrl.clone()
                destination.pathname = target.pathname
                destination.search = target.search
                const response = NextResponse.redirect(destination, 307)
                response.headers.set('Cache-Control', 'private, no-store')
                return response
            }
        }
        return NextResponse.next()
    }


    // Apply rate limiting only to API routes
    if (pathname.startsWith('/api/')) {
        const session = await auth()
        return applyRateLimit(request, session, pathname)
    }

    // For non-API routes, apply next-intl middleware then add CSP
    const response = intlMiddleware(request)
    // Retire the old cookie-only preference; language is now explicit in the URL.
    if (request.cookies.has('NEXT_LOCALE')) response.cookies.delete('NEXT_LOCALE')

    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
    response.headers.set('x-nonce', nonce)
    response.headers.set('Content-Security-Policy', generateCsp(nonce))

    return response
}

export const config = {
    matcher: [
        // Match all API routes for rate limiting
        '/api/:path*',
        '/_next/image',
        // Match all pathnames for intl except API, _next, _vercel, and files with dots
        '/((?!api|_next|_vercel|.*\\..*).*)',
        // Match all pathnames within /users, optionally with locale prefix
        '/([\\w-]+)?/users/(.+)',
    ],
}
