'use client'

import { Sparkles, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useTranslations } from 'next-intl'

interface PromptFormProps {
    hasKey: boolean | null
    prompt: string
    setPrompt: (p: string) => void
    model: string
    setModel: (m: string) => void
    isSubmitting: boolean
    onSubmit: (e: React.FormEvent) => void
}

export function PromptForm({
    hasKey,
    prompt,
    setPrompt,
    model,
    setModel,
    isSubmitting,
    onSubmit
}: PromptFormProps) {
    const t = useTranslations('imageWorkspace')

    return (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 space-y-6 shadow-sm">
            <div className="flex flex-col gap-1 border-b border-border/60 pb-4">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Image Parameters
                </h3>
                <p className="text-xs text-muted-foreground">
                    Input details for generating your media
                </p>
            </div>
            <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                            Model Selection
                        </label>
                        <Select
                            value={model}
                            onValueChange={setModel}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sourceful/riverflow-v2.5-pro:free">
                                    Riverflow v2.5 Pro (Free)
                                </SelectItem>
                                <SelectItem value="google/gemini-2.5-flash:free">
                                    Gemini 2.5 Flash (Free)
                                </SelectItem>
                                <SelectItem value="black-forest-labs/flux.2-pro">
                                    Flux 2 Pro (Paid)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">
                            {t('promptLabel')}
                        </label>
                        <Textarea
                            placeholder={t('promptPlaceholder')}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                            className="resize-none"
                            disabled={!hasKey}
                        />
                    </div>
                </div>
                <div className="pt-2">
                    <Button
                        type="submit"
                        disabled={!hasKey || !prompt.trim() || isSubmitting}
                        className="w-full bg-gradient-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95 flex items-center gap-2 h-11"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Scheduling Task...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4" />
                                {t('generate')}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
