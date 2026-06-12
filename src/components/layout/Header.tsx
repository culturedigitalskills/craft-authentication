'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Menu, X } from 'lucide-react'
import { NavbarAuth } from './NavbarAuth'
import { LanguageSelect } from '@/components/shared/LanguageSelect'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

export function Header({ needsOnboarding = false }: { needsOnboarding?: boolean }) {
    const t = useTranslations()
    const pathname = usePathname()
    const [menuOpen, setMenuOpen] = useState(false)
    const navRef = useRef<HTMLElement>(null)
    const [indicator, setIndicator] = useState({ left: 0, width: 0 })
    const [indicatorReady, setIndicatorReady] = useState(false)

    // Measure the active link and position the sliding indicator
    const updateIndicator = useCallback(() => {
        if (!navRef.current) return
        const activeLink = navRef.current.querySelector('[data-active="true"]') as HTMLElement | null
        if (activeLink) {
            const navRect = navRef.current.getBoundingClientRect()
            const linkRect = activeLink.getBoundingClientRect()
            setIndicator({
                left: linkRect.left - navRect.left,
                width: linkRect.width,
            })
            setIndicatorReady(true)
        } else {
            setIndicatorReady(false)
        }
    }, [])

    useEffect(() => {
        updateIndicator()
    }, [pathname, updateIndicator])

    // Recalculate on resize (e.g. font size changes)
    useEffect(() => {
        window.addEventListener('resize', updateIndicator)
        return () => window.removeEventListener('resize', updateIndicator)
    }, [updateIndicator])

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
            <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="container mx-auto flex items-center justify-between px-4 py-3">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                            <span className="text-sm font-bold text-white">{t('initials')}</span>
                        </div>
                        <div>
                            <h1 className="text-base font-bold leading-tight text-primary">{t('title')}</h1>
                            <p className="text-[11px] leading-tight text-muted-foreground">{t('subtitle')}</p>
                        </div>
                    </Link>

                    {/* Desktop nav */}
                    <nav ref={navRef} className="relative hidden items-center gap-1 md:flex">
                        {/* Sliding indicator */}
                        <span
                            className="absolute -bottom-[13px] h-0.5 rounded-full bg-warm transition-all duration-300 ease-in-out"
                            style={{
                                left: indicator.left,
                                width: indicator.width,
                                opacity: indicatorReady ? 1 : 0,
                            }}
                        />

                        {navLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                data-active={isActive(link.href)}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                                    isActive(link.href)
                                        ? 'text-warm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {/* Separator */}
                        <div className="mx-3 h-5 w-px bg-border" />

                        <div className="flex items-center gap-2">
                            <NavbarAuth variant="desktop" needsOnboarding={needsOnboarding} />
                            <LanguageSelect isMobile={false} jsonlan={t('locale')} />
                            <ThemeToggle />
                        </div>
                    </nav>

                    {/* Mobile hamburger */}
                    <button
                        type="button"
                        onClick={() => setMenuOpen(true)}
                        className="inline-flex items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-muted md:hidden"
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
                style={{ backgroundColor: 'oklch(0.08 0.01 250 / 0.4)' }}
                onClick={() => setMenuOpen(false)}
            />

            {/* Drawer */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-background shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
                    menuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <Link
                        href="/"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                            <span className="text-sm font-bold text-white">{t('initials')}</span>
                        </div>
                        <span className="text-base font-bold text-primary">{t('title')}</span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-md p-2 text-foreground transition-colors hover:bg-muted"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Drawer nav links */}
                <nav className="flex flex-col px-2 py-2">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className={`rounded-md px-3 py-3 text-base font-medium transition-colors ${
                                isActive(link.href)
                                    ? 'bg-warm/5 text-warm'
                                    : 'text-foreground hover:bg-muted'
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Drawer auth & language */}
                <div className="mt-auto border-t border-border px-4 py-4">
                    <NavbarAuth variant="mobile" needsOnboarding={needsOnboarding} onAction={() => setMenuOpen(false)} />
                    <div className="mt-4 flex items-center gap-3">
                        <LanguageSelect isMobile={true} jsonlan={t('locale')} />
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </>
    )
}
