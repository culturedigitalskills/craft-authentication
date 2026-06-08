'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    ShieldCheck,
    ShieldAlert,
    Key,
    RefreshCw,
    AlertTriangle,
    FileUp,
    FileCheck,
    Activity,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Clock,
    Info,
    ExternalLink,
    HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VaultSetupModal } from '@/components/vault/VaultSetupModal'

interface ContentCredentialsClientProps {
    userId: string
}

interface C2PAStatus {
    vaultInitialized: boolean
    c2paInitialized: boolean
    c2paAutoRenew: boolean
    c2paCertExpiresAt: string | null
    needsRenewal: boolean
    rootCertPem: string | null
}

export function ContentCredentialsClient({ userId }: ContentCredentialsClientProps) {
    const [status, setStatus] = useState<C2PAStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [setupModalOpen, setSetupModalOpen] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [autoRenewLoading, setAutoRenewLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [commonName, setCommonName] = useState('')

    // Verification Panel state
    const [dragActive, setDragActive] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [verifyError, setVerifyError] = useState<string | null>(null)
    const [verifyResult, setVerifyResult] = useState<{
        hasManifest: boolean
        authentic: boolean
        artisanName?: string
        creatorUserId?: string
        issuer?: string
        date?: string | null
        validationStatus: string[]
        assertions: Array<{
            action: string
            description?: string | null
            softwareAgent: string
            timestamp?: string | null
        }>
    } | null>(null)

    // Fetch setup status from server
    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/c2pa/status')
            if (!res.ok) throw new Error('Failed to fetch status')
            const data: C2PAStatus & { defaultCN?: string } = await res.json()
            setStatus(data)
            if (data.defaultCN) {
                setCommonName(data.defaultCN)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load C2PA configuration status.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    // Toggle auto-renewal
    const handleToggleAutoRenew = async (enabled: boolean) => {
        if (autoRenewLoading) return
        setAutoRenewLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/c2pa/auto-renew', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled }),
            })
            if (!res.ok) throw new Error('Failed to update preference')
            setStatus((prev) => (prev ? { ...prev, c2paAutoRenew: enabled } : null))
        } catch (err: any) {
            setError(err.message || 'Failed to update auto-renewal setting.')
        } finally {
            setAutoRenewLoading(false)
        }
    }

    // Trigger Setup or Renewal on the server
    const handleConfigureC2PA = async () => {
        if (!commonName.trim()) {
            setError('Please enter a valid Common Name.')
            return
        }
        setActionLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/c2pa/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commonName: commonName.trim() }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to configure C2PA credentials')
            await fetchStatus()
        } catch (err: any) {
            setError(err.message || 'C2PA configuration failed.')
        } finally {
            setActionLoading(false)
        }
    }

    // Handle File Drop / Select for verification
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await verifyFile(e.dataTransfer.files[0])
        }
    }

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await verifyFile(e.target.files[0])
        }
    }

    const verifyFile = async (file: File) => {
        setVerifying(true)
        setVerifyResult(null)
        setVerifyError(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/c2pa/verify', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.error || 'Verification failed')
            }

            const data = await res.json()
            console.log('C2PA verification data:', data, 'current userId:', userId)
            
            setVerifyResult({
                hasManifest: data.hasManifest,
                authentic: data.verified,
                artisanName: data.artisanName,
                creatorUserId: data.creatorUserId,
                issuer: data.issuer,
                date: data.date,
                validationStatus: data.validationStatus,
                assertions: data.assertions,
            })
        } catch (err: any) {
            console.error(err)
            setVerifyError(
                'Error verifying Content Credentials: ' + (err.message || 'Unknown error.'),
            )
        } finally {
            setVerifying(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">
                    Loading Content Credentials status...
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-12">
            {/* Header section */}
            <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    C2PA Industry Standard
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-foreground">
                    Content Credentials
                </h1>
                <p className="text-lg text-muted-foreground">
                    Protect your work and prove you made it. Every image you upload gets a
                    tamper-proof stamp of authorship, so anyone can see who created it, when, and
                    what changes were made along the way.
                </p>
            </div>

            {error && (
                <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>{error}</div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Settings and Status (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Condition 1: Vault not initialized */}
                    {!status?.vaultInitialized && (
                        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 space-y-6 shadow-sm">
                            <div className="flex items-center justify-between border-b border-border/60 pb-4">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    <Key className="h-5 w-5 text-muted-foreground" />
                                    Secure Vault Required
                                </h3>
                                <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-semibold">
                                    Inactive
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Before you can sign your work, you need to set up your secure vault.
                                The vault safely stores your signing identity so only you can mark
                                images as yours.
                            </p>
                            <Button className="w-full" onClick={() => setSetupModalOpen(true)}>
                                Configure Secure Vault
                            </Button>
                        </div>
                    )}

                    {/* Condition 2: Vault is initialized, but C2PA is inactive */}
                    {status?.vaultInitialized && !status.c2paInitialized && (
                        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 space-y-6 shadow-sm">
                            <div className="flex items-center justify-between border-b border-border/60 pb-4">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-amber-500 animate-pulse" />
                                    Activate Credentials
                                </h3>
                                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
                                    Setup Pending
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Your vault is ready. Activating Content Credentials creates your
                                personal signing identity. From then on, every image you upload is
                                automatically marked as yours.
                            </p>

                            <div className="space-y-2">
                                <label
                                    htmlFor="c2pa-cn"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Your name on signed images
                                </label>
                                <input
                                    id="c2pa-cn"
                                    type="text"
                                    value={commonName}
                                    onChange={(e) => setCommonName(e.target.value)}
                                    placeholder="e.g. John Doe"
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    disabled={actionLoading}
                                />
                                <p className="text-xs text-muted-foreground leading-normal">
                                    This name appears on every image you sign, so others can see who
                                    created it.
                                </p>
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleConfigureC2PA}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                        Generating Keys...
                                    </>
                                ) : (
                                    'Activate Content Credentials'
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Condition 3: C2PA Credentials Active */}
                    {status?.c2paInitialized && (
                        <div className="space-y-6">
                            {/* Setup Status Card */}
                            <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 space-y-6 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
                                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-primary" />
                                        Signing Active
                                    </h3>
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">
                                        Active
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {status.c2paCertExpiresAt && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                Certificate Expires:
                                            </span>
                                            <span className="font-medium text-foreground">
                                                {new Date(
                                                    status.c2paCertExpiresAt,
                                                ).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                    )}

                                    {/* Auto-renew Toggle */}
                                    <div className="flex items-start justify-between gap-4 border-t border-border/60 pt-4">
                                        <div className="space-y-0.5">
                                            <label
                                                htmlFor="auto-renew"
                                                className="text-sm font-semibold text-foreground cursor-pointer"
                                            >
                                                Auto-renew Certificate
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                Automatically refresh your signing identity before
                                                it expires.
                                            </p>
                                        </div>
                                        <input
                                            id="auto-renew"
                                            type="checkbox"
                                            checked={status.c2paAutoRenew}
                                            onChange={(e) =>
                                                handleToggleAutoRenew(e.target.checked)
                                            }
                                            disabled={autoRenewLoading}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1 cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-border/60 pt-4 flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="w-full text-xs py-2 h-auto"
                                        onClick={handleConfigureC2PA}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? (
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                                        ) : (
                                            <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                        )}
                                        Rotate Keys
                                    </Button>
                                </div>
                            </div>

                            {/* Warning Banner if expiring within 30 days */}
                            {status.needsRenewal && (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 space-y-4 shadow-sm animate-pulse">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-amber-900 text-sm">
                                                Certificate Expiring Soon
                                            </h4>
                                            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                                Your signing identity expires soon. Renew it now to
                                                keep your uploads verified without any interruption.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="default"
                                        className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none text-xs"
                                        onClick={handleConfigureC2PA}
                                        disabled={actionLoading}
                                    >
                                        Renew Certificate Now
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Drag-and-drop verification interface (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 shadow-sm space-y-6">
                        <div className="border-b border-border/60 pb-4">
                            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                <Activity className="h-5 w-5 text-muted-foreground" />
                                Verify Asset Credentials
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Drop any image here to check whether it carries a verified creator
                                stamp and see its full history.
                            </p>
                        </div>

                        {/* Drag and Drop Container */}
                        <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                                dragActive
                                    ? 'border-primary bg-primary/5 scale-[0.99]'
                                    : 'border-border hover:border-primary/50'
                            }`}
                        >
                            {verifying ? (
                                <div className="flex flex-col items-center py-6">
                                    <RefreshCw className="h-10 w-10 animate-spin text-primary mb-4" />
                                    <p className="text-sm text-foreground font-medium">
                                        Checking the image...
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Verifying creator signature
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center py-4">
                                    <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-sm font-semibold text-foreground">
                                        Drag & drop image here, or{' '}
                                        <label className="text-primary hover:underline cursor-pointer">
                                            browse
                                            <input
                                                type="file"
                                                accept="image/jpeg, image/png, image/webp"
                                                className="hidden"
                                                onChange={handleFileInput}
                                            />
                                        </label>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Supports JPEG, PNG, and WebP images.
                                    </p>
                                </div>
                            )}
                        </div>

                        {verifyError && (
                            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                <div>{verifyError}</div>
                            </div>
                        )}

                        {/* Verification Results Panel */}
                        {verifyResult && (
                            <div className="space-y-6 border-t border-border/60 pt-6">
                                {/* Status Alert */}
                                {verifyResult.hasManifest ? (
                                    verifyResult.authentic ? (
                                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                                            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                {verifyResult.creatorUserId && userId && verifyResult.creatorUserId.trim().toLowerCase() === userId.trim().toLowerCase() && (
                                                    <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase bg-emerald-600 text-white rounded mb-1">
                                                        This is your creation
                                                    </span>
                                                )}
                                                <h4 className="font-bold text-sm">
                                                    Authentic Credentials Secured
                                                </h4>
                                                <p className="text-xs text-emerald-800 leading-relaxed">
                                                    This image has a valid creator stamp that hasn't
                                                    been altered. It was signed by a registered
                                                    artisan.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive flex items-start gap-3">
                                            <XCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-sm">
                                                    Signature Issues Found
                                                </h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    This image has a creator stamp, but it appears
                                                    to have been tampered with or the signer is not
                                                    recognised.
                                                </p>
                                                <div className="mt-2 text-xs font-mono space-y-1 text-destructive">
                                                    {verifyResult.validationStatus.map(
                                                        (err, idx) => (
                                                            <div key={idx}>• {err}</div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="p-4 rounded-2xl bg-muted border border-border text-muted-foreground flex items-start gap-3">
                                        <Info className="h-6 w-6 text-muted-foreground shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-sm text-foreground">
                                                No Credentials Found
                                            </h4>
                                            <p className="text-xs leading-relaxed">
                                                This image is unsigned and does not contain a C2PA
                                                manifest. It has no verifiable history or origin.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Certificate Details */}
                                {verifyResult.hasManifest && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-2xl border border-border/50 text-xs">
                                        <div>
                                            <p className="text-muted-foreground font-medium">
                                                Creator
                                            </p>
                                            <p className="font-semibold text-foreground text-sm mt-0.5">
                                                {verifyResult.artisanName}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground font-medium">
                                                Issued By
                                            </p>
                                            <p className="font-semibold text-foreground mt-0.5">
                                                {verifyResult.issuer}
                                            </p>
                                        </div>
                                        {verifyResult.date && (
                                            <div className="md:col-span-2 border-t border-border/60 pt-2 mt-2">
                                                <p className="text-muted-foreground font-medium">
                                                    Signing Time
                                                </p>
                                                <p className="font-semibold text-foreground mt-0.5">
                                                    {new Date(verifyResult.date).toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Timeline of Edits */}
                                {verifyResult.hasManifest &&
                                    verifyResult.assertions &&
                                    verifyResult.assertions.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="font-bold text-sm text-foreground">
                                                Provenance Timeline
                                            </h4>
                                            <div className="relative border-l border-border ml-3.5 pl-6 space-y-6">
                                                {verifyResult.assertions.map((assertion, idx) => (
                                                    <div key={idx} className="relative">
                                                        {/* Timeline node */}
                                                        <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-primary">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                        </span>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="font-bold text-foreground capitalize">
                                                                    {assertion.action.replace(
                                                                        'c2pa.',
                                                                        '',
                                                                    )}
                                                                </span>
                                                                {assertion.timestamp && (
                                                                    <span className="text-muted-foreground">
                                                                        {new Date(
                                                                            assertion.timestamp,
                                                                        ).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {assertion.description ||
                                                                    `Operation performed using ${assertion.softwareAgent}.`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Vault Setup Modal wizard */}
            <VaultSetupModal
                open={setupModalOpen}
                onOpenChange={setSetupModalOpen}
                userId={userId}
                onSuccess={() => {
                    setSetupModalOpen(false)
                    fetchStatus()
                }}
            />
        </div>
    )
}
