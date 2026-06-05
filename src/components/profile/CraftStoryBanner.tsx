'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BookOpen, ArrowRight, CheckCircle2, Pencil } from 'lucide-react'

export type CraftStoryBannerProps = {
    state: 'none' | 'draft' | 'published'
    progress?: number
    total?: number
    slug?: string | null
}

export function CraftStoryBanner({ state, progress = 0, total = 8, slug = null }: CraftStoryBannerProps) {
    const t = useTranslations('craftStory.banner')

    if (state === 'published') {
        return (
            <div className="flex flex-col gap-3 rounded-2xl border border-warm/30 bg-warm/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 sm:items-center">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warm/15 text-warm">
                        <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <div>
                        <p className="text-base font-semibold tracking-tight">
                            {t('publishedBadge')}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {t('publishedBody')}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {slug && (
                        <Link
                            href={`/artisans/${slug}#craft-story`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                        >
                            {t('view')}
                        </Link>
                    )}
                    <Link
                        href="/onboarding/story"
                        className="inline-flex items-center gap-1.5 rounded-md bg-warm px-3 py-2 text-sm font-medium text-warm-foreground transition-opacity hover:opacity-90"
                    >
                        <Pencil className="h-4 w-4" />
                        {t('edit')}
                    </Link>
                </div>
            </div>
        )
    }

    const isDraft = state === 'draft'
    return (
        <Link
            href="/onboarding/story"
            className="group flex flex-col gap-3 rounded-2xl border border-warm/30 bg-warm/5 p-5 transition-all hover:border-warm/60 hover:bg-warm/10 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="flex items-start gap-3 sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warm/15 text-warm">
                    <BookOpen className="h-5 w-5" />
                </span>
                <div>
                    <p className="text-base font-semibold tracking-tight">
                        {isDraft ? t('continueTitle') : t('startTitle')}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {isDraft
                            ? t('continueBody', { current: progress, total })
                            : t('startBody')}
                    </p>
                </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warm group-hover:gap-2.5">
                {isDraft ? t('continueCta') : t('startCta')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
        </Link>
    )
}
