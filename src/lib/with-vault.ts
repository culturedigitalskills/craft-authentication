import 'server-only'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { VaultContext, VaultNotAccessibleError, VaultSecretNotFoundError } from '@/lib/vault-context'

type AuthResult = Awaited<ReturnType<typeof requireAuth>>
type AuthedSession = NonNullable<AuthResult['session']>

type VaultHandler<TRouteCtx = unknown> = (
    request: Request,
    ctx: { session: AuthedSession; vault: VaultContext; routeCtx: TRouteCtx }
) => Promise<Response>

/**
 * Route handler wrapper that resolves auth and the user's VaultContext before
 * calling the handler. The vault is always disposed after the handler returns,
 * even if it throws. Callers only need vault.getSecret(type) — no knowledge of
 * KMS or wrapping modes required.
 *
 * Usage (static route):
 *   export const POST = withVault(async (req, { session, vault }) => { ... })
 *
 * Usage (dynamic route with params):
 *   export const POST = withVault<{ params: Promise<{ id: string }> }>(
 *     async (req, { vault, routeCtx }) => {
 *       const { id } = await routeCtx.params
 *     }
 *   )
 */
export function withVault<TRouteCtx = unknown>(
    handler: VaultHandler<TRouteCtx>
): (request: Request, routeCtx: TRouteCtx) => Promise<Response> {
    return async (request: Request, routeCtx: TRouteCtx): Promise<Response> => {
        const { session, unauthorized } = await requireAuth()
        if (unauthorized) return unauthorized

        let vault: VaultContext | undefined
        try {
            vault = await VaultContext.forUser(session!.user.id)
            return await handler(request, { session: session!, vault, routeCtx })
        } catch (err: any) {
            if (err instanceof VaultNotAccessibleError) {
                return NextResponse.json({ error: err.message }, { status: 403 })
            }
            if (err instanceof VaultSecretNotFoundError) {
                return NextResponse.json({ error: err.message }, { status: 404 })
            }
            return NextResponse.json(
                { error: err.message || 'Internal server error' },
                { status: err.statusCode ?? 500 }
            )
        } finally {
            vault?.dispose()
        }
    }
}
