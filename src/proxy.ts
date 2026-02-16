import { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i8n/routing'
import { auth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rate-limiter'

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing)

/**
 * Combined proxy with:
 * - Rate limiting for API routes
 * - Internationalization for all other routes
 */
export default async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Apply rate limiting only to API routes
    if (pathname.startsWith('/api/')) {
        const session = await auth()
        return applyRateLimit(request, session, pathname)
    }

    // For non-API routes, apply next-intl middleware
    return intlMiddleware(request)
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
