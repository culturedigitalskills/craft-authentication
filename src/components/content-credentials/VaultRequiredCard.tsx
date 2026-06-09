import { Key } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VaultRequiredCardProps {
    onSetupVault: () => void
}

export function VaultRequiredCard({ onSetupVault }: VaultRequiredCardProps) {
    return (
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
            <Button className="w-full" onClick={onSetupVault}>
                Configure Secure Vault
            </Button>
        </div>
    )
}
