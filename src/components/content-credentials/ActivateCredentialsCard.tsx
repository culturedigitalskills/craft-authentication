import { ShieldAlert, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ActivateCredentialsCardProps {
    commonName: string
    setCommonName: (name: string) => void
    actionLoading: boolean
    onActivate: () => void
}

export function ActivateCredentialsCard({
    commonName,
    setCommonName,
    actionLoading,
    onActivate,
}: ActivateCredentialsCardProps) {
    return (
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
                onClick={onActivate}
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
    )
}
