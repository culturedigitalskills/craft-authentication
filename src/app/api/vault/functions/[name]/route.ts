import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { KMS } from '@/lib/kms'
import { VAULT_FUNCTIONS } from '@/lib/vault-functions'
import { decryptPayloadServer } from '@/lib/user-secrets-service'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    const userId = session!.user.id
    const { name } = await params
    const fn = VAULT_FUNCTIONS[name]

    if (!fn) {
        return NextResponse.json({ error: `Unknown vault function: ${name}` }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { args, request_key } = body

        let plaintextSecret: string

        // SSE_KMS path: server autonomously unwraps the master key and decrypts the secret
        const kmsRecord = await prisma.userWrappedVaultKeys.findFirst({
            where: { userId, wrapMode: 'SSE_KMS' },
        })

        if (kmsRecord) {
            const secretRecord = await prisma.userSecrets.findFirst({
                where: { userId, type: fn.requiredSecretType },
            })

            if (!secretRecord) {
                return NextResponse.json(
                    { error: `No secret of type '${fn.requiredSecretType}' found in vault` },
                    { status: 404 }
                )
            }

            const masterKey = await KMS.unwrapMasterKey(kmsRecord.wrappedKey)
            plaintextSecret = decryptPayloadServer(secretRecord.ciphertextData, masterKey)
            masterKey.fill(0)
        } else if (request_key?.encrypted_value) {
            // E2E path: client must have RSA-OAEP-encrypted the specific plaintext secret
            // using the public key from GET /api/vault/kms-public-key before sending it here.
            if (request_key.secret_type !== fn.requiredSecretType) {
                return NextResponse.json(
                    { error: `request_key.secret_type must be '${fn.requiredSecretType}' for this function` },
                    { status: 400 }
                )
            }
            try {
                plaintextSecret = await KMS.decryptRequestSecret(request_key.encrypted_value)
            } catch {
                return NextResponse.json(
                    {
                        error:
                            'Failed to decrypt request_key.encrypted_value. ' +
                            'The value must be the plaintext secret RSA-OAEP-encrypted with the ' +
                            'current KMS public key from GET /api/vault/kms-public-key. ' +
                            'Fetch a fresh public key and re-encrypt before retrying.',
                    },
                    { status: 400 }
                )
            }
        } else {
            return NextResponse.json(
                {
                    error: 'No SSE_KMS escrow found for this user. ' +
                        'Provide request_key.encrypted_value (the required secret wrapped with the KMS public key) to authorize this operation.',
                    requiredSecretType: fn.requiredSecretType,
                },
                { status: 403 }
            )
        }

        const result = await fn.execute(plaintextSecret, args ?? {})
        return NextResponse.json({ result })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Function execution failed' },
            { status: 500 }
        )
    }
}
