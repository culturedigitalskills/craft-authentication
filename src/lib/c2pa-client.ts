import { authClient } from './auth-client'
import type { C2PAState } from '@/types/c2pa'

export async function getClientC2PAState(
    file: File,
    targetUserId?: string
): Promise<C2PAState> {
    try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/c2pa/verify', {
            method: 'POST',
            body: formData,
        })

        if (!res.ok) {
            return 'invalid'
        }

        const data = await res.json()
        if (!data.hasManifest) {
            return 'none'
        }

        if (!data.verified) {
            return 'invalid'
        }

        let userId = targetUserId
        if (!userId) {
            const sessionRes = await authClient.getSession()
            userId = sessionRes?.data?.user?.id
        }

        if (userId && data.creatorUserId && data.creatorUserId.trim().toLowerCase() === userId.trim().toLowerCase()) {
            return 'owned'
        }

        return 'valid'
    } catch (err) {
        return 'invalid'
    }
}
