'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronDown, Languages, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { routing } from '@/i8n/routing'
import { usePathname } from '@/i8n/navigation'
import {
    languageNames,
    languageSwitchHref,
    languageSwitchNeedsConfirmation,
    type SiteLocale,
} from '@/i8n/language-switch'

export function LanguageSelect({ isMobile }: { isMobile: boolean }) {
    const locale = useLocale() as SiteLocale
    const t = useTranslations('languageSelector')
    const pathname = usePathname()
    const [pending, setPending] = useState(false)

    useEffect(() => {
        // Back/forward cache can restore this document with its pending state.
        const restore = () => setPending(false)
        window.addEventListener('pageshow', restore)
        return () => window.removeEventListener('pageshow', restore)
    }, [])

    function changeLanguage(nextLocale: SiteLocale) {
        if (nextLocale === locale || pending) return
        if (languageSwitchNeedsConfirmation(pathname) && !window.confirm(t('confirmChange'))) return

        // Read at selection time, including changes made by filters or anchors
        // after this menu was rendered. No locale cookie is changed on cancel.
        const href = languageSwitchHref(
            pathname,
            window.location.search,
            window.location.hash,
            nextLocale,
        )
        setPending(true)
        window.location.assign(href)
    }

    return (
        <DropdownMenu dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    aria-label={t('label', { language: languageNames[locale] })}
                    aria-busy={pending}
                    className={`min-h-11 gap-2 ${isMobile ? 'w-full justify-between' : 'px-3'}`}
                >
                    {pending
                        ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        : <Languages className="h-4 w-4" aria-hidden="true" />}
                    <span lang={locale} dir="auto">{languageNames[locale]}</span>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" aria-label={t('menu')}>
                {routing.locales.map((code) => (
                    <DropdownMenuItem
                        key={code}
                        onSelect={() => changeLanguage(code)}
                        aria-current={code === locale ? 'true' : undefined}
                        className="min-h-11 justify-between gap-6 px-3"
                    >
                        <span lang={code} dir="auto">{languageNames[code]}</span>
                        {code === locale && <Check className="h-4 w-4" aria-hidden="true" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
