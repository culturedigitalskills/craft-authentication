export interface C2PAStatus {
    vaultInitialized: boolean
    c2paInitialized: boolean
    c2paAutoRenew: boolean
    c2paCertExpiresAt: string | null
    needsRenewal: boolean
    rootCertPem: string | null
}

export interface Assertion {
    action: string
    description?: string | null
    softwareAgent: string
    timestamp?: string | null
    parameters?: Record<string, string> | null
    digitalSourceType?: string | null
    signer?: string | null
    issuer?: string | null
    untrusted?: boolean
    invalid?: boolean
}

export interface VerifyResult {
    hasManifest: boolean
    authentic: boolean
    untrusted?: boolean
    artisanName?: string
    creatorUserId?: string
    issuer?: string
    date?: string | null
    validationStatus: string[]
    assertions: Assertion[]
}
