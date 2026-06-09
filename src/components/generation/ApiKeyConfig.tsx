'use client'

import { useState } from 'react'
import { Key, Loader2, Edit2, Info, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useTranslations } from 'next-intl'
import { storeOpenRouterApiKeyAction } from '@/app/actions/vault'

interface ApiKeyConfigProps {
    hasKey: boolean | null
    setHasKey: (present: boolean) => void
}

export function ApiKeyConfig({ hasKey, setHasKey }: ApiKeyConfigProps) {
    const t = useTranslations('imageWorkspace')
    const [keyPopoverOpen, setKeyPopoverOpen] = useState(false)
    const [apiKeyInput, setApiKeyInput] = useState('')
    const [isStoringKey, setIsStoringKey] = useState(false)
    const [keyError, setKeyError] = useState<string | null>(null)

    // Handle storing the API key
    const handleStoreKey = async () => {
        if (!apiKeyInput.trim()) {
            setKeyError('API Key cannot be empty')
            return
        }
        setIsStoringKey(true)
        setKeyError(null)
        try {
            await storeOpenRouterApiKeyAction(apiKeyInput.trim())
            setHasKey(true)
            setApiKeyInput('')
            setKeyPopoverOpen(false)
        } catch (err: any) {
            setKeyError(err.message || 'Failed to save key')
        } finally {
            setIsStoringKey(false)
        }
    }

    return (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 space-y-6 shadow-sm relative overflow-visible">
            <div className="flex flex-col gap-1 border-b border-border/60 pb-4">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    API Credentials
                </h3>
                <p className="text-xs text-muted-foreground">
                    Set up your OpenRouter.ai credentials
                </p>
            </div>
            <div className="space-y-4">
                {hasKey === null ? (
                    <div className="h-10 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    </div>
                ) : hasKey ? (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <Input
                                type="text"
                                value="••••••••••••••••••••"
                                disabled
                                className="bg-muted/50 border-muted"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-green-600 font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Active
                            </span>
                        </div>
                        <Popover open={keyPopoverOpen} onOpenChange={(open) => {
                            setKeyPopoverOpen(open)
                            if (!open) {
                                setApiKeyInput('')
                                setKeyError(null)
                            }
                        }}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 shrink-0 border-primary/20 hover:border-primary/50 transition-colors"
                                    title={t('editKey')}
                                >
                                    <Edit2 className="w-4 h-4 text-primary" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-4 space-y-4 shadow-xl border-border bg-background" align="end" side="bottom" sideOffset={8}>
                                <div className="space-y-2">
                                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                        <Info className="w-4 h-4 text-primary" /> Setup Key
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {t('apiKeyInfo')}
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <Input
                                        type="text"
                                        placeholder="sk-or-..."
                                        value={apiKeyInput}
                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                        className="w-full"
                                        autoComplete="off"
                                        name="openrouter-api-key"
                                        data-lpignore="true"
                                        data-1p-ignore
                                        data-bitwarden-ignore="true"
                                        autoFocus
                                    />
                                    {keyError && (
                                        <p className="text-xs text-destructive font-medium flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> {keyError}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setKeyPopoverOpen(false)
                                                setApiKeyInput('')
                                                setKeyError(null)
                                            }}
                                            disabled={isStoringKey}
                                        >
                                            {t('cancel')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleStoreKey}
                                            disabled={isStoringKey}
                                            className="bg-primary hover:bg-primary/90"
                                        >
                                            {isStoringKey ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                    Saving...
                                                </>
                                            ) : (
                                                t('store')
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm flex items-start gap-2.5">
                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div className="leading-snug">
                                {t('noKeyWarning')}
                            </div>
                        </div>
                        <Popover open={keyPopoverOpen} onOpenChange={(open) => {
                            setKeyPopoverOpen(open)
                            if (!open) {
                                setApiKeyInput('')
                                setKeyError(null)
                            }
                        }}>
                            <PopoverTrigger asChild>
                                <Button
                                    className="w-full flex items-center gap-2 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95"
                                >
                                    <Key className="w-4 h-4" /> {t('addKey')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-4 space-y-4 shadow-xl border-border bg-background" align="center" side="bottom" sideOffset={8}>
                                <div className="space-y-2">
                                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                        <Info className="w-4 h-4 text-primary" /> Setup Key
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {t('apiKeyInfo')}
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <Input
                                        type="text"
                                        placeholder="sk-or-..."
                                        value={apiKeyInput}
                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                        className="w-full"
                                        autoComplete="off"
                                        name="openrouter-api-key"
                                        data-lpignore="true"
                                        data-1p-ignore
                                        data-bitwarden-ignore="true"
                                        autoFocus
                                    />
                                    {keyError && (
                                        <p className="text-xs text-destructive font-medium flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> {keyError}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setKeyPopoverOpen(false)
                                                setApiKeyInput('')
                                                setKeyError(null)
                                            }}
                                            disabled={isStoringKey}
                                        >
                                            {t('cancel')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleStoreKey}
                                            disabled={isStoringKey}
                                            className="bg-primary hover:bg-primary/90"
                                        >
                                            {isStoringKey ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                    Saving...
                                                </>
                                            ) : (
                                                t('store')
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )}
            </div>
        </div>
    )
}
