'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Activity,
    FileUp,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Info,
    FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { VerifyResult } from './types'
import { ProvenanceTimeline } from './ProvenanceTimeline'

interface AssetVerificationPanelProps {
    userId: string
}

export function AssetVerificationPanel({ userId }: AssetVerificationPanelProps) {
    const [dragActive, setDragActive] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [verifyError, setVerifyError] = useState<string | null>(null)
    const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const previewUrlRef = useRef<string | null>(null)
    const changeInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        }
    }, [])

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
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        const url = URL.createObjectURL(file)
        previewUrlRef.current = url
        setPreviewUrl(url)
        setVerifying(true)
        setVerifyResult(null)
        setVerifyError(null)

        try {
            const res = await fetch('/api/c2pa/verify', {
                method: 'POST',
                body: file,
                headers: { 'Content-Type': file.type || 'application/octet-stream' },
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
                untrusted: data.untrusted,
                artisanName: data.artisanName,
                creatorUserId: data.creatorUserId,
                issuer: data.issuer,
                date: data.date,
                validationStatus: data.validationStatus,
                assertions: data.assertions,
            })
        } catch (err: any) {
            console.error(err)
            setVerifyError('Error verifying Content Credentials: ' + (err.message || 'Unknown error.'))
        } finally {
            setVerifying(false)
        }
    }

    return (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 shadow-sm space-y-6">
            <div className="border-b border-border/60 pb-4">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    Verify Asset Credentials
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                    Drop any image here to check whether it carries a verified creator stamp and see
                    its full history.
                </p>
            </div>

            {/* Drag and Drop Zone */}
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
                {previewUrl ? (
                    <div className="relative w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Uploaded image preview"
                            className="w-full max-h-72 object-contain rounded-xl"
                        />
                        {verifying && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 rounded-xl backdrop-blur-sm">
                                <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
                                <p className="text-sm text-foreground font-medium">
                                    Verifying...
                                </p>
                            </div>
                        )}
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

            {verifyResult && (
                <div className="space-y-6 border-t border-border/60 pt-6">
                    {/* Status Alert */}
                    {verifyResult.hasManifest ? (
                        verifyResult.authentic ? (
                            verifyResult.untrusted ? (
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                                    <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        {verifyResult.creatorUserId &&
                                            userId &&
                                            verifyResult.creatorUserId.trim().toLowerCase() ===
                                                userId.trim().toLowerCase() && (
                                                <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase bg-amber-600 text-white rounded mb-1">
                                                    This is your creation
                                                </span>
                                            )}
                                        <h4 className="font-bold text-sm">
                                            Credentials Secured (Untrusted Issuer)
                                        </h4>
                                        <p className="text-xs text-amber-800 leading-relaxed">
                                            This image has a valid creator stamp that hasn't been
                                            altered. However,{' '}
                                            {verifyResult.artisanName &&
                                            verifyResult.issuer &&
                                            verifyResult.artisanName === verifyResult.issuer ? (
                                                <>
                                                    the signing certificate for{' '}
                                                    <span className="font-semibold">
                                                        {verifyResult.artisanName}
                                                    </span>{' '}
                                                    is self-signed and not globally trusted.
                                                </>
                                            ) : (
                                                <>
                                                    the root signing certificate/issuer{' '}
                                                    <span className="font-semibold">
                                                        {verifyResult.issuer || 'unknown issuer'}
                                                    </span>{' '}
                                                    (which issued the certificate for{' '}
                                                    <span className="font-semibold">
                                                        {verifyResult.artisanName}
                                                    </span>
                                                    ) is self-signed or not globally trusted.
                                                </>
                                            )}
                                        </p>
                                        <div className="mt-2 text-xs font-mono space-y-1 text-amber-700 border-t border-amber-200/50 pt-2">
                                            {verifyResult.validationStatus.map((err, idx) => (
                                                <div key={idx}>• {err}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        {verifyResult.creatorUserId &&
                                            userId &&
                                            verifyResult.creatorUserId.trim().toLowerCase() ===
                                                userId.trim().toLowerCase() && (
                                                <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase bg-emerald-600 text-white rounded mb-1">
                                                    This is your creation
                                                </span>
                                            )}
                                        <h4 className="font-bold text-sm">
                                            Authentic Credentials Secured
                                        </h4>
                                        <p className="text-xs text-emerald-800 leading-relaxed">
                                            This image has a valid creator stamp that hasn't been
                                            altered. It was signed by a registered artisan.
                                        </p>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive flex items-start gap-3">
                                <XCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h4 className="font-bold text-sm">Signature Issues Found</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        This image has a creator stamp, but it appears to have been
                                        tampered with or the signer is not recognised.
                                    </p>
                                    <div className="mt-2 text-xs font-mono space-y-1 text-destructive">
                                        {verifyResult.validationStatus.map((err, idx) => (
                                            <div key={idx}>• {err}</div>
                                        ))}
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
                                    This image is unsigned and does not contain a C2PA manifest. It
                                    has no verifiable history or origin.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Certificate Details */}
                    {verifyResult.hasManifest && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-2xl border border-border/50 text-xs">
                            <div>
                                <p className="text-muted-foreground font-medium">Creator</p>
                                <p className="font-semibold text-foreground text-sm mt-0.5">
                                    {verifyResult.artisanName}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-medium">Issued By</p>
                                <p className="font-semibold text-foreground mt-0.5">
                                    {verifyResult.issuer}
                                </p>
                            </div>
                            {verifyResult.date && (
                                <div className="md:col-span-2 border-t border-border/60 pt-2 mt-2">
                                    <p className="text-muted-foreground font-medium">Signing Time</p>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {new Date(verifyResult.date).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {verifyResult.hasManifest && verifyResult.assertions?.length > 0 && (
                        <ProvenanceTimeline assertions={verifyResult.assertions} />
                    )}
                </div>
            )}

            {previewUrl && !verifying && (
                <div className="flex justify-end border-t border-border/60 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changeInputRef.current?.click()}
                    >
                        <FolderOpen className="h-3.5 w-3.5 mr-2" />
                        Change image
                    </Button>
                    <input
                        ref={changeInputRef}
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        className="hidden"
                        onChange={handleFileInput}
                    />
                </div>
            )}
        </div>
    )
}
