import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { toNextJsHandler } from 'better-auth/next-js'
import { createAuthMiddleware, APIError } from 'better-auth/api'
import { hashPassword } from 'better-auth/crypto'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { C2PAService } from '@/lib/c2pa-service'

export const betterAuthInstance = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    secret: process.env.AUTH_SECRET,
    baseURL: process.env.AUTH_URL ? process.env.AUTH_URL : undefined,
    emailAndPassword: {
        enabled: true,
        // Using Better Auth's default highly secure scrypt hashing
    },
    // Only register Google when credentials are configured — otherwise Better Auth
    // warns about the missing clientId/clientSecret on every startup.
    socialProviders: {
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? {
                  google: {
                      clientId: process.env.GOOGLE_CLIENT_ID,
                      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  },
              }
            : {}),
    },
    user: {
        additionalFields: {
            role: {
                type: 'string',
                required: false,
                defaultValue: 'ARTISAN',
                input: false,
            },
            isActive: {
                type: 'boolean',
                required: false,
                defaultValue: true,
                input: false,
            },
        },
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path === '/sign-in/email') {
                const { email, password } = ctx.body || {}
                if (!email || !password) return

                const normalizedEmail = email.toLowerCase()

                // Find user and their accounts
                const user = await prisma.user.findUnique({
                    where: { email: normalizedEmail },
                    include: {
                        accounts: {
                            where: { providerId: 'credential' },
                        },
                    },
                })

                if (!user) return

                // Case 1: User has a legacy password on the User model
                if (
                    user.password &&
                    (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))
                ) {
                    const isLegacyValid = await bcrypt.compare(password, user.password)
                    if (isLegacyValid) {
                        const newHash = await hashPassword(password)

                        // Upsert Account record
                        await prisma.account.upsert({
                            where: {
                                providerId_accountId: {
                                    providerId: 'credential',
                                    accountId: user.email,
                                },
                            },
                            update: { password: newHash },
                            create: {
                                id: crypto.randomUUID(),
                                userId: user.id,
                                providerId: 'credential',
                                accountId: user.email,
                                password: newHash,
                            },
                        })

                        // Clear the legacy password column
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { password: null },
                        })
                    } else {
                        // The legacy password was wrong! Throw APIError to return proper invalid credentials error
                        throw new APIError('UNAUTHORIZED', {
                            message: 'Invalid email or password',
                        })
                    }
                }
                // Case 2: User has an Account record with legacy bcrypt hash
                else if (user.accounts.length > 0) {
                    const account = user.accounts[0]
                    if (
                        account.password &&
                        (account.password.startsWith('$2a$') || account.password.startsWith('$2b$'))
                    ) {
                        const isLegacyValid = await bcrypt.compare(password, account.password)
                        if (isLegacyValid) {
                            const newHash = await hashPassword(password)

                            await prisma.account.update({
                                where: { id: account.id },
                                data: { password: newHash },
                            })

                            // Also ensure legacy User.password is cleared if it wasn't
                            if (user.password) {
                                await prisma.user.update({
                                    where: { id: user.id },
                                    data: { password: null },
                                })
                            }
                        } else {
                            // The legacy password was wrong! Throw APIError to return proper invalid credentials error
                            throw new APIError('UNAUTHORIZED', {
                                message: 'Invalid email or password',
                            })
                        }
                    }
                }
            }
        }),
    },
})

export const handlers = toNextJsHandler(betterAuthInstance)

// NextAuth compatibility auth() function
export async function auth() {
    const headersList = await headers()
    const sessionData = await betterAuthInstance.api.getSession({
        headers: headersList,
    })
    if (!sessionData) return null

    // Background auto-renew check
    // Run asynchronously in the background so it doesn't block the request path
    C2PAService.checkAndAutoRenew(sessionData.user.id).catch((err) => {
        console.error('Error in background C2PA auto-renew check:', err)
    })

    return {
        user: {
            id: sessionData.user.id,
            name: sessionData.user.name,
            email: sessionData.user.email,
            image: sessionData.user.image,
            role: sessionData.user.role as 'ADMIN' | 'ARTISAN',
            isActive: sessionData.user.isActive,
        },
        expires: sessionData.session.expiresAt.toISOString(),
    }
}

// Dummy compatibility exports
export const signIn = async () => {}
export const signOut = async () => {}
