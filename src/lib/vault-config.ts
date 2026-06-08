import 'server-only'

export function getVaultServerSecret(): string {
    const secret = process.env.VAULT_SERVER_SECRET
    if (!secret) {
        throw new Error(
            'VAULT_SERVER_SECRET is not set. ' +
                "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
        )
    }
    return secret
}
