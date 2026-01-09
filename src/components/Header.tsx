'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'

export function Header() {
    const locale = useLocale()
    const t = useTranslations('header')
    const pathname = usePathname()

    const switchLocale = (newLocale: string) => {
        if (!pathname) return `/${newLocale}`
        const segments = pathname.split('/')
        segments[1] = newLocale
        return segments.join('/')
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between max-w-6xl mx-auto px-4">
                <Link href={`/${locale}`} className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        SC
                    </div>
                    <span className="text-lg font-bold">SustainableCrafting</span>
                </Link>

                <nav className="flex items-center gap-4">
                    {/* Language Switcher */}
                    <div className="flex gap-2">
                        <Link
                            href={switchLocale('en')}
                            className={`text-sm px-3 py-1 rounded transition-colors ${
                                locale === 'en'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted'
                            }`}
                        >
                            English
                        </Link>
                        <Link
                            href={switchLocale('hi')}
                            className={`text-sm px-3 py-1 rounded transition-colors ${
                                locale === 'hi'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted'
                            }`}
                        >
                            हिंदी
                        </Link>
                    </div>

                    <Link
                        href={`/${locale}/login`}
                        className="text-sm font-medium transition-colors hover:text-primary"
                    >
                        {t('login')}
                    </Link>
                </nav>
            </div>
        </header>
    )
}
