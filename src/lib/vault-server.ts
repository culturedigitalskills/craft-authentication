import 'server-only'
import { auth } from '@/lib/auth'
import { VaultContext } from '@/lib/vault-context'
import type { SecretType } from '@/lib/vault-types'

/**
 * Retrieves and decrypts a secret for the currently authenticated user.
 * Must only be called from server-side code (Server Actions, route handlers).
 * The returned plaintext must never be included in any response sent to a client.
 */
export async function getVaultSecret(type: SecretType): Promise<string> {
    const session = await auth()
    if (!session?.user) throw new Error('Not authenticated')

    const vault = await VaultContext.forUser(session.user.id)
    try {
        return await vault.getSecret(type)
    } finally {
        vault.dispose()
    }
}
