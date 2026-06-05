import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible'
import { NextRequest, NextResponse } from 'next/server'
import { RateLimitErrorResponse } from './validations/types'

const authLimiter = new RateLimiterMemory({
    points: 5,
    duration: 1 * 60, // 5 attempts per minute for login/register
})

const apiLimiter = new RateLimiterMemory({
    points: 60,
    duration: 60, // 60 requests per minute for general API
})

/**
 * Get client identifier from request
 * Prioritize: user session > IP address
 */
function getClientId(request: Request, session?: { user?: { id?: string } } | null): string {
    // If user is authenticated, use user ID
    if (session?.user?.id) {
        return `user:${session.user.id}`
    }

    // Fall back to IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
    return `ip:${ip}`
}

/**
 * rate limiting middleware for API routes
 */
export async function applyRateLimit(
    request: NextRequest,
    session: { user?: { id?: string } } | null,
    pathname: string,
): Promise<NextResponse> {
    // Only apply strict auth limiter to actual login/register attempts
    // NextAuth session/csrf/providers/callback routes use the general limiter
    const isAuthAttempt =
        pathname === '/api/auth/callback/credentials' ||
        pathname === '/api/auth/register'
    const limiter = isAuthAttempt ? authLimiter : apiLimiter
    const clientId = getClientId(request, session)

    try {
        const rateLimiterRes: RateLimiterRes = await limiter.consume(clientId, 1)

        const response = NextResponse.next()

        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', rateLimiterRes.remainingPoints.toString())
        response.headers.set('X-RateLimit-Remaining', rateLimiterRes.remainingPoints.toString())
        response.headers.set(
            'X-RateLimit-Reset',
            Math.ceil(rateLimiterRes.msBeforeNext / 1000).toString(),
        )

        return response
    } catch (rateLimiterRes: unknown) {
        // Rate limit exceeded
        const rlRes = rateLimiterRes as { msBeforeNext?: number; consumedPoints?: number }
        const retryAfter = Math.ceil((rlRes.msBeforeNext || 1000) / 1000)

        return NextResponse.json<RateLimitErrorResponse>(
            {
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter,
            },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': (rlRes.consumedPoints ?? 0).toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': retryAfter.toString(),
                    'Retry-After': retryAfter.toString(),
                },
            },
        )
    }
}
