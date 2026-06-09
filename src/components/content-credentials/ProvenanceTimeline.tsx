import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Assertion } from './types'

interface ProvenanceTimelineProps {
    assertions: Assertion[]
}

export function ProvenanceTimeline({ assertions }: ProvenanceTimelineProps) {
    if (assertions.length === 0) return null

    return (
        <div className="space-y-3">
            <h4 className="font-bold text-sm text-foreground">Provenance Timeline</h4>
            <div className="relative border-l border-border ml-3.5 pl-6 space-y-6">
                {assertions.map((assertion, idx) => (
                    <div key={idx} className="relative">
                        <span
                            className="absolute flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-primary"
                            style={{ left: '-32.5px', top: 0 }}
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        </span>
                        <div className="space-y-1" style={{ marginLeft: '-4px' }}>
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-foreground capitalize">
                                    {assertion.action.replace('c2pa.', '')}
                                </span>
                                {assertion.timestamp && (
                                    <span className="text-muted-foreground">
                                        {new Date(assertion.timestamp).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            {assertion.signer && (
                                <div className="text-xs font-medium text-foreground/70 flex flex-col gap-1 mt-1">
                                    <div className="flex items-center gap-1.5">
                                        {assertion.invalid ? (
                                            <span
                                                title="Invalid Certificate"
                                                className="inline-flex items-center gap-1 text-destructive"
                                            >
                                                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                                <span className="font-semibold">
                                                    {assertion.signer}
                                                </span>{' '}
                                                (Invalid Signer)
                                            </span>
                                        ) : assertion.untrusted &&
                                          assertion.signer === assertion.issuer ? (
                                            <span
                                                title="Self-Signed Untrusted Certificate"
                                                className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-500"
                                            >
                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                <span className="font-semibold">
                                                    {assertion.signer}
                                                </span>{' '}
                                                (Self-Signed / Untrusted)
                                            </span>
                                        ) : (
                                            <span
                                                title="Valid Certificate"
                                                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-500"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                <span className="font-semibold">
                                                    {assertion.signer}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    {assertion.issuer && (
                                        <div
                                            className="flex items-center gap-1 pl-5 text-[11px]"
                                            style={{ marginTop: '-4px' }}
                                        >
                                            {assertion.invalid ? (
                                                <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                                            ) : assertion.untrusted ? (
                                                <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                                            ) : (
                                                <CheckCircle2 className="h-3 w-3 text-emerald-500/80 shrink-0" />
                                            )}
                                            <span className="text-muted-foreground font-normal">
                                                Issued by
                                            </span>
                                            <span
                                                className={
                                                    assertion.invalid
                                                        ? 'font-semibold text-destructive/80'
                                                        : assertion.untrusted
                                                          ? 'font-semibold text-amber-600 dark:text-amber-500'
                                                          : 'font-semibold text-emerald-600/80 dark:text-emerald-500/80'
                                                }
                                            >
                                                {assertion.issuer}
                                                {assertion.untrusted && !assertion.invalid
                                                    ? ' (Untrusted Root CA)'
                                                    : ''}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {assertion.description ||
                                    `Operation performed using ${assertion.softwareAgent}.`}
                            </p>
                            {assertion.parameters?.model && (
                                <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                                    <p>
                                        <span className="font-medium">Model:</span>{' '}
                                        {assertion.parameters.model}
                                    </p>
                                    {assertion.parameters.size && (
                                        <p>
                                            <span className="font-medium">Size:</span>{' '}
                                            {assertion.parameters.size}
                                        </p>
                                    )}
                                    {assertion.parameters.prompt && (
                                        <p>
                                            <span className="font-medium truncate">Prompt:</span>{' '}
                                            {assertion.parameters.prompt}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
