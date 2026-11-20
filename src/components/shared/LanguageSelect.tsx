'use client'

import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, ChevronDown, Languages, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { buttonVariants } from '@/components/ui/button'
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
    const search = useSearchParams().toString()
    const [pending, setPending] = useState(false)
    const [open, setOpen] = useState(false)
    const menuId = useId()
    const details = useRef<HTMLDetailsElement>(null)

    useEffect(() => {
        const restore = () => setPending(false)
        const outside = (event: PointerEvent) => {
            if (details.current && !details.current.contains(event.target as Node))
                details.current.open = false
        }
        window.addEventListener('pageshow', restore)
        document.addEventListener('pointerdown', outside)
        return () => {
            window.removeEventListener('pageshow', restore)
            document.removeEventListener('pointerdown', outside)
        }
    }, [])

    function changeLanguage(event: MouseEvent<HTMLAnchorElement>, nextLocale: SiteLocale) {
        // Opening another tab does not discard this page's unsaved work.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
            return
        if (nextLocale === locale || pending) {
            event.preventDefault()
            if (details.current) details.current.open = false
            return
        }
        if (languageSwitchNeedsConfirmation(pathname) && !window.confirm(t('confirmChange'))) {
            event.preventDefault()
            if (details.current) {
                details.current.open = false
                details.current.querySelector('summary')?.focus()
            }
            return
        }
        event.currentTarget.href = languageSwitchHref(
            pathname,
            window.location.search,
            window.location.hash,
            nextLocale,
        )
        setPending(true)
    }

    return (
        <details
            ref={details}
            onToggle={(event) => setOpen(event.currentTarget.open)}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            className={isMobile ? 'relative w-full' : 'relative'}
            onKeyDown={(event) => {
                if (event.key === 'Escape' && details.current?.open) {
                    details.current.open = false
                    details.current.querySelector('summary')?.focus()
                }
            }}
        >
            <summary
                role="button"
                tabIndex={0}
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={t('label', { language: languageNames[locale] })}
                aria-busy={pending}
                aria-disabled={pending}
                onClick={(event) => {
                    if (pending) event.preventDefault()
                }}
                className={
                    buttonVariants({ variant: 'outline' }) +
                    ' min-h-11 cursor-pointer list-none gap-2 px-3 [&::-webkit-details-marker]:hidden' +
                    (isMobile ? ' flex w-full justify-between' : '')
                }
            >
                {pending ? (
                    <Loader2
                        className="h-4 w-4 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                    />
                ) : (
                    <Languages className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="language-native-name" lang={locale} dir="auto">
                    {languageNames[locale]}
                </span>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </summary>
            <nav
                id={menuId}
                aria-label={t('menu')}
                className={
                    'absolute end-0 z-50 max-h-[60dvh] min-w-44 overflow-y-auto rounded-[var(--sc-r-btn)] border p-1 shadow-[var(--sc-shadow-card)] ' +
                    (isMobile ? 'bottom-full mb-1' : 'top-full mt-1')
                }
                style={{
                    background: 'var(--sc-surface)',
                    borderColor: 'var(--sc-border)',
                    color: 'var(--sc-text)',
                }}
            >
                <ul>
                    {routing.locales.map((code) => (
                        <li key={code}>
                            <a
                                href={languageSwitchHref(
                                    pathname,
                                    search ? '?' + search : '',
                                    '',
                                    code,
                                )}
                                hrefLang={code}
                                onClick={(event) => changeLanguage(event, code)}
                                aria-current={code === locale ? 'true' : undefined}
                                aria-disabled={pending}
                                className="flex min-h-11 items-center justify-between gap-6 rounded-md px-3 text-sm hover:bg-[var(--sc-paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sc-accent)]"
                            >
                                <span className="language-native-name" lang={code} dir="auto">
                                    {languageNames[code]}
                                </span>
                                {code === locale && (
                                    <Check className="h-4 w-4" aria-hidden="true" />
                                )}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </details>
    )
}
