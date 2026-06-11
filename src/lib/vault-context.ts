import 'server-only'
import { prisma } from '@/lib/prisma'
import { KMS } from '@/lib/kms'
import { decryptPayloadServer } from '@/lib/user-secrets-service'

export class VaultNotAccessibleError extends Error {
    readonly statusCode = 403
    constructor() {
        super('No SSE_KMS escrow found. The vault cannot be accessed server-side for this user.')
        this.name = 'VaultNotAccessibleError'
    }
}

export class VaultSecretNotFoundError extends Error {
    readonly statusCode = 404
    constructor(type: string) {
        super(`No secret of type '${type}' found in vault.`)
        this.name = 'VaultSecretNotFoundError'
    }
}

export class VaultContext {
    private readonly masterKey: Uint8Array
    private readonly userId: string
    private disposed = false

    private constructor(userId: string, masterKey: Uint8Array) {
        this.userId = userId
        this.masterKey = masterKey
    }

    static async forUser(userId: string): Promise<VaultContext> {
        const kmsRecord = await prisma.userWrappedVaultKeys.findFirst({
            where: { userId, wrapMode: 'SSE_KMS' },
        })

        if (!kmsRecord) throw new VaultNotAccessibleError()

        const masterKey = await KMS.unwrapMasterKey(kmsRecord.wrappedKey)
        return new VaultContext(userId, masterKey)
    }

    async getSecret(type: string): Promise<string> {
        if (this.disposed) throw new Error('VaultContext has been disposed')

        const record = await prisma.userSecrets.findFirst({
            where: { userId: this.userId, type },
        })

        if (!record) throw new VaultSecretNotFoundError(type)

        return decryptPayloadServer(record.ciphertextData, this.masterKey)
    }

    dispose(): void {
        this.masterKey.fill(0)
        this.disposed = true
    }
}
