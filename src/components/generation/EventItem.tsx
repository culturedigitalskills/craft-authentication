'use client'

import { Calendar, CheckCircle, AlertTriangle, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

interface EventItemProps {
    event: any
    onShowDetail: (event: any) => void
    onCancel: (eventId: string) => void
    onRetry: (eventId: string) => void
    onRemove: (eventId: string) => void
}

export function EventItem({ event, onShowDetail, onCancel, onRetry, onRemove }: EventItemProps) {
    const t = useTranslations('imageWorkspace')

    // Task states
    const isCompleted = !!event.receivedAt
    const isError = !!event.errorAt
    const isCanceled = !!event.canceledAt
    const isSent = !!event.sentAt && !isCompleted && !isError && !isCanceled
    const isPending = !event.sentAt && !isCompleted && !isError && !isCanceled

    let statusLabel = t('statusPending')
    let statusColor = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800'
    let icon = <ClockIcon />

    if (isCompleted) {
        statusLabel = t('statusCompleted')
        statusColor = 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50'
        icon = <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
    } else if (isError) {
        statusLabel = t('statusError')
        statusColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'
        icon = <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    } else if (isCanceled) {
        statusLabel = t('statusCanceled')
        statusColor = 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900/50 dark:text-zinc-400 dark:border-zinc-800'
        icon = <XCircleIcon />
    } else if (isSent) {
        statusLabel = t('statusSent')
        statusColor = 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/50'
        icon = <Loader2 className="w-4 h-4 text-violet-600 dark:text-violet-400 animate-spin" />
    }

    return (
        <div className={`p-4 rounded-xl border border-border/80 bg-background/40 hover:bg-background/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300`}>
            
            {/* Left Content info */}
            <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${statusColor}`}>
                        {icon}
                        {statusLabel}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate max-w-full" title={event.settings?.prompt}>
                    {event.settings?.prompt}
                </p>
                {isError && event.errorMessage && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 leading-snug break-words max-w-full">
                        Reason: {event.errorMessage}
                    </p>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                {/* Cancel option */}
                {(isPending || isSent) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCancel(event.id)}
                        className="h-8 border-rose-200/50 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-950/30 dark:hover:bg-rose-950/10 dark:text-rose-400 transition-colors"
                    >
                        Cancel
                    </Button>
                )}

                {/* Retry option on error */}
                {isError && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRetry(event.id)}
                        className="h-8 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-1"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {t('tryAgain')}
                    </Button>
                )}

                {/* Show Detail option on complete */}
                {isCompleted && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onShowDetail(event)}
                        className="h-8 border-border hover:bg-muted font-medium transition-colors"
                    >
                        {t('viewDetail')}
                    </Button>
                )}

                {/* Remove option when finished, error or canceled */}
                {(isCompleted || isError || isCanceled) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(event.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete task from history"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}

/* SVGs Icons */
function ClockIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
        </svg>
    )
}

function XCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
    )
}
