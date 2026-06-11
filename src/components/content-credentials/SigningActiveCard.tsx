import { ShieldCheck, Clock, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { C2PAStatus } from './types'

interface SigningActiveCardProps {
    status: C2PAStatus
    actionLoading: boolean
    autoRenewLoading: boolean
    onToggleAutoRenew: (enabled: boolean) => void
    onConfigureC2PA: () => void
}

export function SigningActiveCard({
    status,
    actionLoading,
    autoRenewLoading,
    onToggleAutoRenew,
    onConfigureC2PA,
}: SigningActiveCardProps) {
    return (
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
                                {new Date(status.c2paCertExpiresAt).toLocaleDateString(undefined, {
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
                                Automatically refresh your signing identity before it expires.
                            </p>
                        </div>
                        <input
                            id="auto-renew"
                            type="checkbox"
                            checked={status.c2paAutoRenew}
                            onChange={(e) => onToggleAutoRenew(e.target.checked)}
                            disabled={autoRenewLoading}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1 cursor-pointer"
                        />
                    </div>
                </div>

                <div className="border-t border-border/60 pt-4 flex gap-3">
                    <Button
                        variant="outline"
                        className="w-full text-xs py-2 h-auto"
                        onClick={onConfigureC2PA}
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
                                Your signing identity expires soon. Renew it now to keep your uploads
                                verified without any interruption.
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="default"
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none text-xs"
                        onClick={onConfigureC2PA}
                        disabled={actionLoading}
                    >
                        Renew Certificate Now
                    </Button>
                </div>
            )}
        </div>
    )
}
