import { after, NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { betterAuthInstance } from '@/lib/auth'
import { eraseAccount } from '@/lib/account-erasure'
import {
    deletionCredentials,
    matchesDeletionPassword,
    REAUTH_WINDOW_MS,
} from '@/lib/account-deletion-auth'
import { drainErasureObjects, RECEIPT_SECONDS } from '@/lib/erasure-storage'

const inputSchema = z
    .object({
        accountId: z.string().min(1),
        confirmation: z.literal(true),
        password: z.string().max(256).optional(),
    })
    .strict()

export async function DELETE(request: NextRequest) {
    const origin = new URL(process.env.AUTH_URL || request.url).origin
    if (request.headers.get('origin') !== origin)
        return NextResponse.json({ error: 'ORIGIN' }, { status: 403 })
    const session = await betterAuthInstance.api.getSession({
        headers: request.headers,
        query: { disableCookieCache: true },
    })
    if (!session) return NextResponse.json({ error: 'SESSION_EXPIRED' }, { status: 401 })
    const input = inputSchema.safeParse(await request.json().catch(() => null))
    if (!input.success || input.data.accountId !== session.user.id) {
        return NextResponse.json({ error: 'CONFIRMATION' }, { status: 400 })
    }

    const credentials = await deletionCredentials(session.user.id)
    if (credentials.password) {
        if (
            !input.data.password ||
            !(await matchesDeletionPassword(credentials.password, input.data.password))
        ) {
            return NextResponse.json({ error: 'PASSWORD' }, { status: 403 })
        }
    } else if (
        !credentials.google ||
        Date.now() - new Date(session.session.createdAt).getTime() > REAUTH_WINDOW_MS
    ) {
        return NextResponse.json({ error: 'REAUTH' }, { status: 403 })
    }

    const result = await eraseAccount(session.user.id, session.session.id)
    if ('error' in result)
        return NextResponse.json(result, { status: result.error === 'LAST_ADMIN' ? 409 : 401 })
    const response = NextResponse.json(
        { pending: result.pending },
        {
            status: result.pending ? 202 : 200,
            headers: { 'Cache-Control': 'no-store' },
        },
    )
    // All database sessions are already revoked. Clear Better Auth's browser cookies too.
    try {
        const signedOut = await betterAuthInstance.api.signOut({
            headers: request.headers,
            asResponse: true,
        })
        for (const cookie of signedOut.headers.getSetCookie())
            response.headers.append('Set-Cookie', cookie)
    } catch {
        // Database deletion has already invalidated the token in every browser.
        console.warn('Could not clear a revoked session cookie')
    }
    response.cookies.set('craft-erasure-receipt', result.receiptId, {
        httpOnly: true,
        sameSite: 'strict',
        secure: origin.startsWith('https:'),
        path: '/',
        maxAge: RECEIPT_SECONDS,
    })
    if (result.pending) after(() => drainErasureObjects(result.receiptId))
    return response
}
