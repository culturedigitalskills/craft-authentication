import { useTranslations as useInterfaceTranslations } from 'next-intl'
import { Key } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VaultRequiredCardProps {
    onSetupVault: () => void
}

export function VaultRequiredCard({ onSetupVault }: VaultRequiredCardProps) {
    const tui = useInterfaceTranslations('interface')

    return (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <Key className="h-5 w-5 text-muted-foreground" />
                    {tui('secureVaultRequired')}
                </h3>
                <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-semibold">
                    {tui('inactive')}
                </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
                {tui('beforeYouCanSignYourWorkYouNeedTo')}
            </p>
            <Button className="w-full" onClick={onSetupVault}>
                {tui('configureSecureVault')}
            </Button>
        </div>
    )
}
