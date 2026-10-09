'use client'

import { useState, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/button'
import { BadgeCheck, ShieldAlert, ShieldOff, Upload, ClipboardPaste, Loader2, Calendar, User, Hash } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface VerifyResult {
    verified: boolean
    error: string | null
    credential: {
        id: string | null
        issuer: { id: string; name?: string }
        validFrom: string
        credentialSubject: Record<string, unknown>
    } | null
}

function formatShortId(id: string): string {
    const parts = id.split('/')
    const last = parts[parts.length - 1]
    return last.length > 16 ? `${last.slice(0, 8)}…${last.slice(-8)}` : last
}

// The API reports failures in English. Map the ones it is known to send to
// translation keys, and fall back to a generic message for anything else.
const VERIFY_ERROR_KEYS: Record<string, string> = {
    'Invalid signature': 'invalidSignature',
    'Invalid issuer': 'invalidIssuer',
}

export default function VerifyPage() {
    const t = useTranslations('verify')
    const locale = useLocale()
    const [input, setInput] = useState('')
    const [result, setResult] = useState<VerifyResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [parseError, setParseError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    async function handleVerify() {
        setParseError(null)
        setResult(null)

        let parsed: unknown
        try {
            parsed = JSON.parse(input.trim())
        } catch {
            setParseError(t('parseError'))
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/vc/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed),
            })
            const data = await res.json()
            if (!res.ok) {
                setParseError(
                    String(data.error ?? '').startsWith('Missing required credential fields')
                        ? t('missingFields')
                        : t('requestFailed'),
                )
            } else {
                setResult(data as VerifyResult)
            }
        } catch {
            setParseError(t('networkError'))
        } finally {
            setLoading(false)
        }
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            setInput((ev.target?.result as string) ?? '')
            setResult(null)
            setParseError(null)
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    return (
        <Container>
            <div className="mx-auto max-w-2xl space-y-8 py-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="mt-2 text-muted-foreground">
                        {t('description')}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('jsonTitle')}</CardTitle>
                        <CardDescription>
                            {t.rich('jsonDescription', {
                                code: chunks => <code className="text-xs">{chunks}</code>,
                            })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <textarea
                            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            rows={10}
                            placeholder={'{\n  "@context": [...],\n  "type": ["VerifiableCredential", "CraftCredential"],\n  ...\n}'}
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value)
                                setResult(null)
                                setParseError(null)
                            }}
                        />

                        {parseError && (
                            <p className="text-xs text-red-600">{parseError}</p>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleVerify} disabled={!input.trim() || loading} className="flex-1 sm:flex-none">
                                {loading ? (
                                    <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t('verifying')}</>
                                ) : (
                                    <><ClipboardPaste className="mr-1.5 h-4 w-4" /> {t('verify')}</>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 sm:flex-none"
                            >
                                <Upload className="mr-1.5 h-4 w-4" />
                                {t('uploadFile')}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,application/json"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>
                    </CardContent>
                </Card>

                {result && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                {result.verified ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-sm font-medium text-white">
                                        <BadgeCheck className="h-4 w-4" />
                                        {t('verified')}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-sm font-medium text-white">
                                        <ShieldAlert className="h-4 w-4" />
                                        {t('failed')}
                                    </span>
                                )}
                            </CardTitle>
                            {!result.verified && result.error && (
                                <CardDescription className="text-red-600">
                                    {t(VERIFY_ERROR_KEYS[result.error] ?? 'genericError')}
                                </CardDescription>
                            )}
                        </CardHeader>

                        {result.credential && (
                            <CardContent>
                                <dl className="space-y-3 text-sm">
                                    {!!result.credential.credentialSubject?.title && (
                                        <div>
                                            <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('product')}</dt>
                                            <dd className="mt-0.5 font-medium">{String(result.credential.credentialSubject.title)}</dd>
                                        </div>
                                    )}
                                    {!!result.credential.credentialSubject?.description && (
                                        <div>
                                            <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('descriptionLabel')}</dt>
                                            <dd className="mt-0.5 text-foreground/80">{String(result.credential.credentialSubject.description)}</dd>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-3">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {t('issued', {
                                                date: new Date(result.credential.validFrom).toLocaleDateString(locale, {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                }),
                                            })}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <User className="h-3.5 w-3.5" />
                                            {result.credential.issuer.name ?? result.credential.issuer.id}
                                        </div>
                                        {result.credential.id && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Hash className="h-3.5 w-3.5" />
                                                <span className="font-mono">{formatShortId(result.credential.id)}</span>
                                            </div>
                                        )}
                                    </div>
                                </dl>
                            </CardContent>
                        )}
                    </Card>
                )}

                {!result && !loading && (
                    <div className="flex flex-col items-center gap-2 py-4 text-center text-muted-foreground">
                        <ShieldOff className="h-8 w-8 opacity-30" />
                        <p className="text-sm">{t('emptyState')}</p>
                    </div>
                )}
            </div>
        </Container>
    )
}
