'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react'
import { VaultSetupModal } from '@/components/vault/VaultSetupModal'
import {
    VaultRequiredCard,
    ActivateCredentialsCard,
    SigningActiveCard,
    AssetVerificationPanel,
} from '@/components/content-credentials'
import type { C2PAStatus } from '@/components/content-credentials'

interface ContentCredentialsClientProps {
    userId: string
}

export function ContentCredentialsClient({ userId }: ContentCredentialsClientProps) {
    const [status, setStatus] = useState<C2PAStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [setupModalOpen, setSetupModalOpen] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [autoRenewLoading, setAutoRenewLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [commonName, setCommonName] = useState('')

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
                <div className="lg:col-span-5 space-y-6">
                    {!status?.vaultInitialized && (
                        <VaultRequiredCard onSetupVault={() => setSetupModalOpen(true)} />
                    )}
                    {status?.vaultInitialized && !status.c2paInitialized && (
                        <ActivateCredentialsCard
                            commonName={commonName}
                            setCommonName={setCommonName}
                            actionLoading={actionLoading}
                            onActivate={handleConfigureC2PA}
                        />
                    )}
                    {status?.c2paInitialized && (
                        <SigningActiveCard
                            status={status}
                            actionLoading={actionLoading}
                            autoRenewLoading={autoRenewLoading}
                            onToggleAutoRenew={handleToggleAutoRenew}
                            onConfigureC2PA={handleConfigureC2PA}
                        />
                    )}
                </div>

                <div className="lg:col-span-7">
                    <AssetVerificationPanel userId={userId} />
                </div>
            </div>

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
