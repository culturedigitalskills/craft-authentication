import { BadgeCheck, ShieldAlert, ShieldOff, Calendar, User, Hash, Download } from 'lucide-react'

interface VerifiableCredentialCardProps {
    credentialId: string | null
    issuanceDate: Date | null
    issuerName: string | null
    holderDid: string | null
    verified: boolean | null
    craftId: string | null
}

function formatShortId(credentialId: string): string {
    const parts = credentialId.split('/')
    const id = parts[parts.length - 1]
    return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-6)}` : id
}

export function VerifiableCredentialCard({
    credentialId,
    issuanceDate,
    issuerName,
    verified,
    craftId,
}: VerifiableCredentialCardProps) {
    if (verified === null || !credentialId) {
        return (
            <div className="w-full rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-center">
                <ShieldOff className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Certificate pending</p>
            </div>
        )
    }

    return (
        <div className="w-full space-y-3 rounded-md border border-border bg-muted/20 px-4 py-3">
            {/* Verification status */}
            <div className="flex items-center justify-center">
                {verified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Credential verified
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Verification failed
                    </span>
                )}
            </div>

            {/* Credential metadata */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
                {issuanceDate && (
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>
                            Issued{' '}
                            {new Date(issuanceDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </span>
                    </div>
                )}
                {issuerName && (
                    <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span>{issuerName}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-mono">{formatShortId(credentialId)}</span>
                </div>
            </div>

            {/* Download button */}
            {craftId && (
                <a
                    href={`/api/vc/${craftId}`}
                    download={`credential-${craftId}.json`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                    <Download className="h-3.5 w-3.5" />
                    Download Certificate
                </a>
            )}
        </div>
    )
}