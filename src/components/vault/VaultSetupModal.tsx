'use client'
import { useTranslations as useInterfaceTranslations } from 'next-intl'

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import {
    Shield,
    Key,
    CheckCircle2,
    Copy,
    Check,
    AlertTriangle,
    Loader2,
    ArrowLeft,
    ArrowRight,
    Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
    generateVaultSetup,
    generateVerificationToken,
    asymmetricWrapMasterKey,
    parseRecoveryToken,
} from '@/lib/crypto-vault'

// ─── Types ───────────────────────────────────────────────────────────────────

type Step =
    | 'checking'
    | 'intro'
    | 'recovery-key'
    | 'verify'
    | 'creating'
    | 'success'
    | 'already-initialized'

interface VaultSetup {
    rawMasterKey: Uint8Array
    recoveryToken: string
    wrappedKeyPayload: string
}

export interface VaultSetupModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** ID of the currently authenticated user */
    userId: string
    onSuccess?: () => void
}

// ─── Step dots (wizard steps only) ───────────────────────────────────────────

const WIZARD_STEPS: Step[] = ['intro', 'recovery-key', 'verify', 'success']

function StepDots({ current }: { current: Step }) {
    if (!WIZARD_STEPS.includes(current) && current !== 'creating') return null
    const resolved: Step = current === 'creating' ? 'verify' : current
    const idx = WIZARD_STEPS.indexOf(resolved)
    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {WIZARD_STEPS.map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        'rounded-full transition-all duration-300',
                        i < idx && 'h-1.5 w-1.5 bg-primary/40',
                        i === idx && 'h-1.5 w-6 bg-primary',
                        i > idx && 'h-1.5 w-1.5 bg-border',
                    )}
                />
            ))}
        </div>
    )
}

// ─── Checking ────────────────────────────────────────────────────────────────

function CheckingStep() {
    return (
        <div className="flex items-center justify-center py-14">
            <Loader2 className="w-7 h-7 text-muted-foreground/60 animate-spin" />
        </div>
    )
}

// ─── Already initialized ─────────────────────────────────────────────────────

function AlreadyInitializedStep({ onClose }: { onClose: () => void }) {
    const tui = useInterfaceTranslations('interface')

    return (
        <div className="flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center ring-1 ring-green-200 dark:ring-green-800/50">
                <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">
                    {tui('vaultAlreadyActive')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
                    {tui('yourVaultIsSetUpAndProtectingYourCredentials')}
                </p>
            </div>

            <div className="w-full rounded-xl bg-muted/60 px-4 py-3 flex items-center gap-3 text-start">
                <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                    <Lock className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground leading-snug">
                    {tui('yourCredentialsAreEncryptedAndStoredSecurelyNoAction')}
                </p>
            </div>

            <Button onClick={onClose} size="lg" variant="outline" className="w-full">
                {tui('close')}
            </Button>
        </div>
    )
}

// ─── Step 1 – Intro ──────────────────────────────────────────────────────────

function IntroStep({ onNext, loading }: { onNext: () => void; loading: boolean }) {
    const tui = useInterfaceTranslations('interface')

    const features = [
        {
            icon: Lock,
            title: tui('yourKeysStayEncrypted'),
            body: tui('nothingIsStoredInPlainTextNotEvenBy'),
        },
        {
            icon: Key,
            title: tui('aRecoveryKeyKeepsYouSafe'),
            body: tui('ifSomethingGoesWrongYouCanAlwaysRestoreAccess'),
        },
        {
            icon: CheckCircle2,
            title: tui('worksSilentlyInTheBackground'),
            body: tui('onceSetUpYouWontNeedToThinkAbout'),
        },
    ]

    return (
        <div className="flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <Shield className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">
                    {tui('protectYourApiKeys')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                    {tui('yourVaultStoresYourSensitiveCredentialsLikeApiKeys')}
                </p>
            </div>

            <div className="w-full space-y-2.5 text-start">
                {features.map(({ icon: Icon, title, body }) => (
                    <div
                        key={title}
                        className="flex gap-3 items-start rounded-xl bg-muted/60 px-4 py-3"
                    >
                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                            <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">{title}</p>
                            <p className="text-xs text-muted-foreground">{body}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Button onClick={onNext} disabled={loading} size="lg" className="w-full">
                {loading ? (
                    <>
                        <Loader2 className="me-2 w-4 h-4 animate-spin" /> {tui('preparing')}
                    </>
                ) : (
                    <>
                        {tui('getStarted')} <ArrowRight className="ms-2 w-4 h-4" />
                    </>
                )}
            </Button>
        </div>
    )
}

// ─── Step 2 – Show recovery key ──────────────────────────────────────────────

function RecoveryKeyStep({
    recoveryToken,
    onBack,
    onNext,
}: {
    recoveryToken: string
    onBack: () => void
    onNext: () => void
}) {
    const tui = useInterfaceTranslations('interface')

    const [copied, setCopied] = useState(false)
    const [confirmed, setConfirmed] = useState(false)

    const prefix = 'CRAFTS-V001'
    const segments = recoveryToken.replace('CRAFTS-V001-', '').split('-')

    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(recoveryToken)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [recoveryToken])

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h2 className="text-base font-semibold">{tui('yourRecoveryKey')}</h2>
                    <p className="text-xs text-muted-foreground">
                        {tui('writeItDownOrSaveItInAPassword')}
                    </p>
                </div>
            </div>

            <div
                dir="ltr"
                className="relative rounded-xl border border-border bg-muted/40 px-4 pt-3 pb-4"
            >
                <p className="text-[11px] text-muted-foreground font-mono mb-2 select-none">
                    {prefix}-
                </p>
                <div className="flex flex-wrap gap-1.5 pe-12">
                    {segments.map((seg, i) => (
                        <span
                            key={i}
                            className="font-mono text-sm font-semibold tracking-widest bg-background border border-border rounded-md px-2 py-1 select-all"
                        >
                            {seg}
                        </span>
                    ))}
                </div>
                <button
                    onClick={handleCopy}
                    aria-label={copied ? tui('copied') : tui('copyRecoveryKey')}
                    className={cn(
                        'absolute top-3 end-3 flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 border transition-all duration-200',
                        copied
                            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400'
                            : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
                    )}
                >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? tui('copied') : tui('copy')}
                </button>
            </div>

            <div className="flex gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3.5 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    <span className="font-semibold">{tui('dontTakeAScreenshot')}</span>{' '}
                    {tui('screenshotsBackUpToCloudServicesAndCanExpose')}
                </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none group">
                <div className="relative shrink-0">
                    <input
                        type="checkbox"
                        className="sr-only"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    <div
                        className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                            confirmed
                                ? 'bg-primary border-primary'
                                : 'border-input bg-background group-hover:border-primary/60',
                        )}
                    >
                        {confirmed && (
                            <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                        )}
                    </div>
                </div>
                <span className="text-sm leading-snug">
                    {tui('iveSavedMyRecoveryKeyInASafePlace')}
                </span>
            </label>

            <div className="flex gap-2.5 pt-1">
                <Button variant="outline" onClick={onBack} className="flex-1">
                    <ArrowLeft className="me-1.5 w-4 h-4" /> {tui('back')}
                </Button>
                <Button onClick={onNext} disabled={!confirmed} className="flex-1">
                    {tui('continue')} <ArrowRight className="ms-1.5 w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}

// ─── Step 3 – Verify recovery key ────────────────────────────────────────────

function VerifyStep({
    recoveryToken,
    onBack,
    onNext,
    apiError,
}: {
    recoveryToken: string
    onBack: () => void
    onNext: () => void
    apiError: string | null
}) {
    const tui = useInterfaceTranslations('interface')

    const [value, setValue] = useState('')
    const [matchError, setMatchError] = useState<string | null>(null)

    const error = matchError ?? apiError

    const handleNext = () => {
        const input = parseRecoveryToken(value.trim())
        const expected = parseRecoveryToken(recoveryToken)
        if (input !== expected) {
            setMatchError(tui('thatDoesntMatchYourRecoveryKeyDoubleCheckWhat'))
            return
        }
        setMatchError(null)
        onNext()
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-base font-semibold">{tui('confirmYourRecoveryKey')}</h2>
                    <p className="text-xs text-muted-foreground">
                        {tui('pasteItBackToMakeSureYouSavedIt')}
                    </p>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="vault-verify-input" className="text-sm">
                    {tui('recoveryKey')}
                </Label>
                <Input
                    id="vault-verify-input"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value)
                        setMatchError(null)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    placeholder="CRAFTS-V001-…"
                    autoComplete="off"
                    spellCheck={false}
                    className={cn(
                        'font-mono text-sm h-11',
                        error && 'border-destructive focus-visible:ring-destructive/40',
                    )}
                />
                {error && (
                    <p className="flex items-center gap-1.5 text-xs text-destructive">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {error}
                    </p>
                )}
            </div>

            <div className="flex gap-2.5">
                <Button variant="outline" onClick={onBack} className="flex-1">
                    <ArrowLeft className="me-1.5 w-4 h-4" /> {tui('back')}
                </Button>
                <Button onClick={handleNext} disabled={!value.trim()} className="flex-1">
                    {tui('createVault')} <ArrowRight className="ms-1.5 w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}

// ─── Creating (intermediate) ─────────────────────────────────────────────────

function CreatingStep() {
    const tui = useInterfaceTranslations('interface')

    return (
        <div className="flex flex-col items-center justify-center gap-5 py-10">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-[3px] border-primary/15" />
                <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-primary" />
                </div>
            </div>
            <div className="text-center space-y-1">
                <p className="text-sm font-medium">{tui('settingUpYourVault')}</p>
                <p className="text-xs text-muted-foreground">
                    {tui('encryptingAndStoringYourKeys')}
                </p>
            </div>
        </div>
    )
}

// ─── Step 4 – Success ────────────────────────────────────────────────────────

function SuccessStep({ onDone }: { onDone: () => void }) {
    const tui = useInterfaceTranslations('interface')

    return (
        <div className="flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center ring-1 ring-green-200 dark:ring-green-800/50">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">{tui('vaultReady')}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
                    {tui('yourCredentialsAreEncryptedAndProtectedYouCanNow')}
                </p>
            </div>

            <div className="w-full rounded-xl bg-muted/60 px-4 py-3 flex items-center gap-3 text-start">
                <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                    <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <p className="text-xs font-medium">{tui('recoveryKeySaved')}</p>
                    <p className="text-xs text-muted-foreground">
                        {tui('keepItSafeItsTheOnlyWayToRecover')}
                    </p>
                </div>
            </div>

            <Button onClick={onDone} size="lg" className="w-full">
                {tui('done')}
            </Button>
        </div>
    )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function VaultSetupModal({ open, onOpenChange, userId, onSuccess }: VaultSetupModalProps) {
    const tui = useInterfaceTranslations('interface')

    const [step, setStep] = useState<Step>('checking')
    const [setup, setSetup] = useState<VaultSetup | null>(null)
    const [introLoading, setIntroLoading] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null)

    const clearSetup = useCallback((s: VaultSetup | null) => {
        if (s) s.rawMasterKey.fill(0)
    }, [])

    const reset = useCallback(() => {
        clearSetup(setup)
        setSetup(null)
        setStep('checking')
        setIntroLoading(false)
        setApiError(null)
    }, [setup, clearSetup])

    // On every open, check whether the vault is already initialised
    useEffect(() => {
        if (!open) return
        let cancelled = false

        async function checkVault() {
            try {
                const res = await fetch('/api/vault/status')
                if (cancelled) return
                if (res.ok) {
                    const { initialized } = await res.json()
                    if (cancelled) return
                    if (initialized) {
                        setStep('already-initialized')
                        return
                    }
                }
            } catch {
                // Network error — fail open so the user can still try to set up
            }
            if (!cancelled) setStep('intro')
        }

        checkVault()
        return () => {
            cancelled = true
        }
    }, [open])

    const handleOpenChange = useCallback(
        (next: boolean) => {
            if (!next && step === 'creating') return
            if (!next) reset()
            onOpenChange(next)
        },
        [step, reset, onOpenChange],
    )

    const handleIntroNext = useCallback(async () => {
        setIntroLoading(true)
        try {
            const vaultSetup = await generateVaultSetup()
            setSetup(vaultSetup)
            setStep('recovery-key')
        } finally {
            setIntroLoading(false)
        }
    }, [])

    const handleCreateVault = useCallback(async () => {
        if (!setup) return
        setStep('creating')
        setApiError(null)

        try {
            const kmsRes = await fetch('/api/vault/kms-public-key')
            if (!kmsRes.ok) throw new Error('Failed to fetch KMS public key')
            const { publicKey } = await kmsRes.json()

            const sseWrappedKey = await asymmetricWrapMasterKey(setup.rawMasterKey, publicKey)
            const verificationToken = await generateVerificationToken(setup.rawMasterKey, userId)

            const initRes = await fetch('/api/vault/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    recovery_token_wrapped_key: setup.wrappedKeyPayload,
                    sse_kms_asymmetrically_wrapped_key: sseWrappedKey,
                    verification_token: verificationToken,
                }),
            })

            if (!initRes.ok) {
                const body = await initRes.json().catch(() => ({}))
                throw new Error(body.error || tui('vaultInitializationFailed'))
            }

            // Zero the master key from memory (best-effort — JS GC does not guarantee this)
            setup.rawMasterKey.fill(0)
            setStep('success')
        } catch (err: any) {
            setApiError(tui('somethingWentWrongPleaseTryAgain'))
            setStep('verify')
        }
    }, [setup, userId])

    const handleDone = useCallback(() => {
        handleOpenChange(false)
        onSuccess?.()
    }, [handleOpenChange, onSuccess])

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="sm:max-w-md rounded-2xl"
                onInteractOutside={(e) => {
                    if (step === 'creating') e.preventDefault()
                }}
                onEscapeKeyDown={(e) => {
                    if (step === 'creating') e.preventDefault()
                }}
            >
                <DialogTitle className="sr-only">{tui('setUpYourSecureVault')}</DialogTitle>
                <DialogDescription className="sr-only">
                    {tui('aGuidedSetupToCreateYourEncryptedCredentialsVault')}
                </DialogDescription>

                <StepDots current={step} />

                {step === 'checking' && <CheckingStep />}

                {step === 'already-initialized' && (
                    <AlreadyInitializedStep onClose={() => handleOpenChange(false)} />
                )}

                {step === 'intro' && <IntroStep onNext={handleIntroNext} loading={introLoading} />}

                {step === 'recovery-key' && setup && (
                    <RecoveryKeyStep
                        recoveryToken={setup.recoveryToken}
                        onBack={() => setStep('intro')}
                        onNext={() => setStep('verify')}
                    />
                )}

                {step === 'verify' && setup && (
                    <VerifyStep
                        recoveryToken={setup.recoveryToken}
                        onBack={() => setStep('recovery-key')}
                        onNext={handleCreateVault}
                        apiError={apiError}
                    />
                )}

                {step === 'creating' && <CreatingStep />}

                {step === 'success' && <SuccessStep onDone={handleDone} />}
            </DialogContent>
        </Dialog>
    )
}
