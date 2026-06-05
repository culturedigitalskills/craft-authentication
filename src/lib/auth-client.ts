import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { betterAuthInstance } from './auth'

export const authClient = createAuthClient({
    plugins: [
        inferAdditionalFields<typeof betterAuthInstance>()
    ]
})

// NextAuth Compatibility Wrappers
export function useSession() {
    const { data, isPending } = authClient.useSession()
    
    return {
        data: data ? {
            user: {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                image: data.user.image,
                role: data.user.role,
                isActive: data.user.isActive,
            },
            expires: data.session.expiresAt,
        } : null,
        status: isPending ? ('loading' as const) : data ? ('authenticated' as const) : ('unauthenticated' as const),
    }
}

export async function signIn(provider: string, options?: { email?: string; password?: string; redirect?: boolean; callbackUrl?: string }) {
    if (provider === 'credentials') {
        try {
            const res = await authClient.signIn.email({
                email: options?.email || '',
                password: options?.password || '',
                callbackURL: options?.callbackUrl || '/auth/redirect',
            })
            if (res.error) {
                return { error: res.error.message || 'Invalid credentials' }
            }
            return { error: null }
        } catch (err: any) {
            return { error: err.message || 'Login failed' }
        }
    } else if (provider === 'google') {
        try {
            await authClient.signIn.social({
                provider: 'google',
                callbackURL: options?.callbackUrl || '/auth/redirect',
            })
            return { error: null }
        } catch (err: any) {
            return { error: err.message || 'Google login failed' }
        }
    }
    return { error: 'Unknown provider' }
}

export async function signOut(options?: { callbackUrl?: string }) {
    await authClient.signOut()
    if (options?.callbackUrl) {
        window.location.href = options.callbackUrl
    } else {
        window.location.reload()
    }
}
