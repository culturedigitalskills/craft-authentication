import { compare } from 'bcryptjs'
import { verifyPassword } from 'better-auth/crypto'
import { prisma } from '@/lib/prisma'

export const REAUTH_WINDOW_MS = 5 * 60 * 1000

export async function deletionCredentials(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            password: true,
            accounts: { select: { providerId: true, password: true } },
        },
    })
    const password =
        user?.accounts.find((a) => a.providerId === 'credential')?.password ?? user?.password
    return { password, google: !!user?.accounts.some((a) => a.providerId === 'google') }
}

export function matchesDeletionPassword(hash: string, password: string) {
    return /^\$2[aby]\$/.test(hash) ? compare(password, hash) : verifyPassword({ hash, password })
}
