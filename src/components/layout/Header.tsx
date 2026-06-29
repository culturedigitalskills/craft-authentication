'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { NavbarAuth } from './NavbarAuth'
import { LanguageSelect } from '@/components/shared/LanguageSelect'

export function Header({ needsOnboarding = false }: { needsOnboarding?: boolean }) {
    const t = useTranslations()
    const pathname = usePathname()
    const [menuOpen, setMenuOpen] = useState(false)

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [menuOpen])

    // Close mobile menu on route change
    useEffect(() => {
        setMenuOpen(false)
    }, [pathname])

    const navLinks = [
        { href: '/', label: t('navbar.home') },
        { href: '/about', label: t('navbar.about') },
        { href: '/crafts', label: t('navbar.crafts') },
        { href: '/artisans', label: t('navbar.artisans') },
        { href: '/groups', label: t('navbar.groups') },
    ]

    // Sub-routes that have their own nav entry (My Crafts, Add Craft). The public
    // "Crafts" link should not light up on these, so nothing is highlighted there.
    const standaloneSubroutes = ['/crafts/mycrafts', '/crafts/create']

    function isActive(href: string) {
        if (href === '/') return pathname === '/' || pathname === ''
        if (standaloneSubroutes.some(route => pathname.startsWith(route))) return false
        return pathname.startsWith(href)
    }

    return (
        <>
            <header className="sc-nav">
                <div className="sc-container flex items-center justify-between py-3">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
                        <div
                            className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                            style={{ background: 'var(--sc-accent)' }}
                        >
                            <span
                                className="text-sm font-semibold"
                                style={{ fontFamily: 'var(--sc-font-display)', color: '#fff8ee' }}
                            >
                                {t('initials')}
                            </span>
                        </div>
                        <div>
                            <span
                                className="block text-base font-semibold leading-tight"
                                style={{ fontFamily: 'var(--sc-font-display)', color: 'var(--sc-ink)' }}
                            >
                                {t('title')}
                            </span>
                            <span className="block text-[11px] leading-tight" style={{ color: 'var(--sc-text-muted)' }}>
                                {t('subtitle')}
                            </span>
                        </div>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="relative hidden items-center gap-6 md:flex">
                        {navLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`sc-nav__link${isActive(link.href) ? ' sc-nav__link--active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {/* Separator */}
                        <div className="mx-1 h-5 w-px" style={{ background: 'var(--sc-border-strong)' }} />

                        <div className="flex items-center gap-3">
                            <NavbarAuth variant="desktop" needsOnboarding={needsOnboarding} />
                            <LanguageSelect isMobile={false} jsonlan={t('locale')} />
                        </div>
                    </nav>

                    {/* Mobile hamburger */}
                    <button
                        type="button"
                        onClick={() => setMenuOpen(true)}
                        className="inline-flex items-center justify-center rounded-[10px] p-2 transition-colors md:hidden"
                        style={{ color: 'var(--sc-ink)' }}
                        aria-label="Open menu"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                </div>
            </header>

            {/* Mobile slide-over menu */}
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-50 transition-opacity duration-300 md:hidden ${
                    menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                style={{ backgroundColor: 'rgba(26, 39, 48, 0.45)' }}
                onClick={() => setMenuOpen(false)}
            />

            {/* Drawer */}
            <div
                className={`fixed inset-y-0 left-0 z-50 flex w-full max-w-xs flex-col shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
                    menuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                style={{ background: 'var(--sc-surface)' }}
            >
                {/* Drawer header */}
                <div className="flex shrink-0 items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--sc-border)' }}>
                    <Link
                        href="/"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3"
                    >
                        <div
                            className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                            style={{ background: 'var(--sc-accent)' }}
                        >
                            <span className="text-sm font-semibold" style={{ fontFamily: 'var(--sc-font-display)', color: '#fff8ee' }}>
                                {t('initials')}
                            </span>
                        </div>
                        <span className="text-base font-semibold" style={{ fontFamily: 'var(--sc-font-display)', color: 'var(--sc-ink)' }}>
                            {t('title')}
                        </span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-[10px] p-2 transition-colors"
                        style={{ color: 'var(--sc-ink)' }}
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Drawer nav links */}
                <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-2">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className="rounded-[10px] px-3 py-3 text-base font-medium transition-colors"
                            style={
                                isActive(link.href)
                                    ? { color: 'var(--sc-accent)', background: 'color-mix(in srgb, var(--sc-accent) 8%, transparent)' }
                                    : { color: 'var(--sc-text)' }
                            }
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Drawer auth & language */}
                <div className="shrink-0 border-t px-4 py-4" style={{ borderColor: 'var(--sc-border)' }}>
                    <NavbarAuth variant="mobile" needsOnboarding={needsOnboarding} onAction={() => setMenuOpen(false)} />
                    <div className="mt-4 flex items-center gap-3">
                        <LanguageSelect isMobile={true} jsonlan={t('locale')} />
                    </div>
                </div>
            </div>
        </>
    )
}
