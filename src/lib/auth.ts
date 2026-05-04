import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { loginRequestSchema } from '@/lib/validations/auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: 'jwt' },
    pages: {
        signIn: '/login',
    },
    providers: [
        Google,
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                try {
                    const parsed = loginRequestSchema.safeParse(credentials)
                    if (!parsed.success) return null

                    const user = await prisma.user.findUnique({
                        where: { email: parsed.data.email },
                    })

                    if (!user || !user.password) return null

                    const passwordMatch = await bcrypt.compare(parsed.data.password, user.password)

                    if (!passwordMatch) return null

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        image: user.image,
                    }
                } catch (error) {
                    console.error('Credentials authorize error:', error)
                    return null
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { role: true },
                })
                token.role = dbUser?.role ?? 'ARTISAN'
            }
            return token
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub
            }
            if (token.role && session.user) {
                session.user.role = token.role as string
            }
            return session
        },
    },
})
