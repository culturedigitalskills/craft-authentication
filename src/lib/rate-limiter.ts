import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible'
import { NextRequest, NextResponse } from 'next/server'
import { RateLimitErrorResponse } from './validations/types'

const authLimiter = new RateLimiterMemory({
    points: 100,
    duration: 1 * 60, // 1 minute
})

const apiLimiter = new RateLimiterMemory({
    points: 100,
    duration: 1, // 1 second
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
    // Determine which limiter to use based on route
    const limiter = pathname.startsWith('/api/auth/') ? authLimiter : apiLimiter
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
    } catch (rateLimiterRes: any) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((rateLimiterRes.msBeforeNext || 1000) / 1000)

        return NextResponse.json<RateLimitErrorResponse>(
            {
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter,
            },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': rateLimiterRes.consumedPoints.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': Math.ceil(rateLimiterRes.msBeforeNext / 1000).toString(),
                    'Retry-After': retryAfter.toString(),
                },
            },
        )
    }
}
