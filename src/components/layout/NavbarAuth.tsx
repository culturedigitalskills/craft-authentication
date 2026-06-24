'use client'

import { useSession, signOut } from '@/lib/auth-client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { User, LogOut, FolderOpen, FolderUp, Users, UserPlus, BookOpen, ShieldCheck, Image, Images, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface NavbarAuthProps {
    onAction?: () => void
    variant?: 'desktop' | 'mobile'
    /** True when the signed-in user has not yet created an artisan profile. */
    needsOnboarding?: boolean
}

// Shared row styling for dropdown / drawer entries, tuned to the --sc-* palette.
const rowBase = 'flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm transition-colors duration-200'
const rowIdle = 'text-[var(--sc-text-soft)] hover:text-[var(--sc-accent)]'
const rowActive = 'text-[var(--sc-accent)]'

// Static terracotta underline shown under the label of the *selected* entry,
// mirroring the active-link indicator in the main navbar.
const activeUnderline =
    'relative after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-[var(--sc-accent)]'

export function NavbarAuth({ onAction, variant = 'desktop', needsOnboarding = false }: NavbarAuthProps) {
    const { data: session, status } = useSession()
    const t = useTranslations('navbar')
    const pathname = usePathname()
    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [dropdownOpen])

    if (status === 'loading') {
        return <div className="h-9 w-9 animate-pulse rounded-full" style={{ background: 'var(--sc-border-strong)' }} />
    }

    // ── Mobile layout: stacked links ──
    if (variant === 'mobile') {
        if (session?.user) {
            return (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="sc-avatar flex h-9 w-9 shrink-0 text-xs"
                            style={{ background: 'var(--sc-ink)' }}
                        >
                            {getInitials(session.user.name, session.user.email)}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium" style={{ color: 'var(--sc-text)' }}>
                                {session.user.name || session.user.email}
                            </p>
                            {session.user.name && session.user.email && (
                                <p className="truncate text-xs" style={{ color: 'var(--sc-text-muted)' }}>{session.user.email}</p>
                            )}
                        </div>
                    </div>
                    {needsOnboarding && (
                        <Link
                            href="/onboarding"
                            onClick={onAction}
                            className="flex items-center gap-2 rounded-[10px] px-2 py-2 text-sm font-medium text-[var(--sc-accent)]"
                            style={{ background: 'color-mix(in srgb, var(--sc-accent) 10%, transparent)' }}
                        >
                            <Sparkles className="h-4 w-4" />
                            {t('completeProfile')}
                        </Link>
                    )}

                    <div className="my-1 border-t" style={{ borderColor: 'var(--sc-border)' }} />

                    {/* Account Profile and Story */}
                    <Link href="/profile" onClick={onAction} className={`${rowBase} ${rowIdle}`}>
                        <User className="h-4 w-4" />
                        {t('profile')}
                    </Link>
                    <Link href="/onboarding/story" onClick={onAction} className={`${rowBase} ${rowIdle}`}>
                        <BookOpen className="h-4 w-4" />
                        {t('mystory')}
                    </Link>
                    <Link href="/media-gallery" onClick={onAction} className={`${rowBase} ${rowIdle}`}>
                        <Images className="h-4 w-4" />
                        {t('mediaGallery')}
                    </Link>
                    <Link href="/content-credentials" onClick={onAction} className={`${rowBase} ${rowIdle}`}>
                        <ShieldCheck className="h-4 w-4" />
                        {t('contentCredentials')}
                    </Link>

                    <div className="my-1 border-t" style={{ borderColor: 'var(--sc-border)' }} />

                    {/* Crafts */}
                    <Link href="/crafts/mycrafts" onClick={onAction} className={`${rowBase} ${rowIdle}`}>
                        <FolderOpen className="h-4 w-4" />
                        {t('myitems')}
                    </Link>
                    <Link href="/crafts/create" onClick={onAction} className={`${rowBase} ${rowIdle}`}>
                        <FolderUp className="h-4 w-4" />
                        {t('addcraft')}
                    </Link>

                    <div className="my-1 border-t" style={{ borderColor: 'var(--sc-border)' }} />

                    {/* Groups */}
                    <Link href="/groups/mygroups" onClick={onAction} className={`${rowBase} ${rowIdle}`}>
                        <Users className="h-4 w-4" />
                        {t('mygroups')}
                    </Link>
                    <Link href="/groups/create" onClick={onAction} className={`${rowBase} ${rowIdle}`}>
                        <UserPlus className="h-4 w-4" />
                        {t('createGroup')}
                    </Link>

                    <div className="my-1 border-t" style={{ borderColor: 'var(--sc-border)' }} />

                    {/* Image tools */}
                    <Link href="/generation-workspace" onClick={onAction} className={`${rowBase} ${rowIdle}`}>
                        <Image className="h-4 w-4" />
                        {t('generationWorkspace')}
                    </Link>

                    <div className="my-1 border-t" style={{ borderColor: 'var(--sc-border)' }} />

                    {/* Logout */}
                    <button
                        type="button"
                        onClick={() => { signOut({ callbackUrl: '/' }); onAction?.() }}
                        className={`${rowBase} text-[var(--sc-accent-deep)] hover:opacity-80`}
                    >
                        <LogOut className="h-4 w-4" />
                        {t('logout')}
                    </button>
                </div>
            )
        }

        return (
            <Link href="/login" onClick={onAction} className="sc-btn sc-btn--primary w-full justify-center">
                {t('login')}
            </Link>
        )
    }

    // ── Desktop layout: avatar dropdown ──
    if (session?.user) {
        return (
            <div className="relative" ref={dropdownRef}>
                <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="sc-avatar flex h-9 w-9 text-xs ring-2 ring-transparent transition-all hover:ring-[color:var(--sc-accent)]/30"
                    style={{ background: 'var(--sc-ink)' }}
                >
                    {getInitials(session.user.name, session.user.email)}
                </button>

                {/* Dropdown */}
                <div
                    className={`absolute right-0 top-full mt-3 w-60 overflow-hidden rounded-[var(--sc-r-card)] border shadow-[var(--sc-shadow-raise)] transition-all ${
                        dropdownOpen
                            ? 'visible translate-y-0 opacity-100'
                            : 'invisible -translate-y-1 opacity-0'
                    }`}
                    style={{ background: 'var(--sc-surface)', borderColor: 'var(--sc-border)' }}
                >
                    {/* User info */}
                    <div className="border-b px-4 py-3" style={{ borderColor: 'var(--sc-border)' }}>
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--sc-text)' }}>
                            {session.user.name || session.user.email}
                        </p>
                        {session.user.name && session.user.email && (
                            <p className="truncate text-xs" style={{ color: 'var(--sc-text-muted)' }}>{session.user.email}</p>
                        )}
                    </div>

                    {/* Onboarding prompt — only until the user has an artisan profile */}
                    {needsOnboarding && (
                        <div className="border-b py-1" style={{ borderColor: 'var(--sc-border)' }}>
                            <Link
                                href="/onboarding"
                                onClick={() => { setDropdownOpen(false); onAction?.() }}
                                className={`${rowBase} font-medium ${rowActive}`}
                            >
                                <Sparkles className="h-4 w-4" />
                                {t('completeProfile')}
                            </Link>
                        </div>
                    )}

                    {/* Account Profile and Story */}
                    <div className="py-1">
                        <Link
                            href="/profile"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`${rowBase} ${isActive('/profile') ? rowActive : rowIdle}`}
                        >
                            <User className="h-4 w-4" />
                            <span className={isActive('/profile') ? activeUnderline : ''}>{t('profile')}</span>
                        </Link>
                        <Link
                            href="/onboarding/story"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`${rowBase} ${isActive('/onboarding/story') ? rowActive : rowIdle}`}
                        >
                            <BookOpen className="h-4 w-4" />
                            <span className={isActive('/onboarding/story') ? activeUnderline : ''}>{t('mystory')}</span>
                        </Link>
                        <Link
                            href="/media-gallery"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`${rowBase} ${isActive('/media-gallery') ? rowActive : rowIdle}`}
                        >
                            <Images className="h-4 w-4" />
                            <span className={isActive('/media-gallery') ? activeUnderline : ''}>{t('mediaGallery')}</span>
                        </Link>
                        <Link
                            href="/content-credentials"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`${rowBase} ${isActive('/content-credentials') ? rowActive : rowIdle}`}
                        >
                            <ShieldCheck className="h-4 w-4" />
                            <span className={isActive('/content-credentials') ? activeUnderline : ''}>{t('contentCredentials')}</span>
                        </Link>
                    </div>

                    {/* Crafts */}
                    <div className="border-t py-1" style={{ borderColor: 'var(--sc-border)' }}>
                        <Link
                            href="/crafts/mycrafts"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`${rowBase} ${isActive('/crafts/mycrafts') ? rowActive : rowIdle}`}
                        >
                            <FolderOpen className="h-4 w-4" />
                            <span className={isActive('/crafts/mycrafts') ? activeUnderline : ''}>{t('myitems')}</span>
                        </Link>
                        <Link
                            href="/crafts/create"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`${rowBase} ${isActive('/crafts/create') ? rowActive : rowIdle}`}
                        >
                            <FolderUp className="h-4 w-4" />
                            <span className={isActive('/crafts/create') ? activeUnderline : ''}>{t('addcraft')}</span>
                        </Link>
                    </div>

                    {/* Groups */}
                    <div className="border-t py-1" style={{ borderColor: 'var(--sc-border)' }}>
                        <Link
                            href="/groups/mygroups"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`${rowBase} ${isActive('/groups/mygroups') ? rowActive : rowIdle}`}
                        >
                            <Users className="h-4 w-4" />
                            <span className={isActive('/groups/mygroups') ? activeUnderline : ''}>{t('mygroups')}</span>
                        </Link>
                        <Link
                            href="/groups/create"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`${rowBase} ${isActive('/groups/create') ? rowActive : rowIdle}`}
                        >
                            <UserPlus className="h-4 w-4" />
                            <span className={isActive('/groups/create') ? activeUnderline : ''}>{t('createGroup')}</span>
                        </Link>
                    </div>

                    {/* Image tools */}
                    <div className="border-t py-1" style={{ borderColor: 'var(--sc-border)' }}>
                        <Link
                            href="/generation-workspace"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`${rowBase} ${isActive('/generation-workspace') ? rowActive : rowIdle}`}
                        >
                            <Image className="h-4 w-4" />
                            <span className={isActive('/generation-workspace') ? activeUnderline : ''}>{t('generationWorkspace')}</span>
                        </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t py-1" style={{ borderColor: 'var(--sc-border)' }}>
                        <button
                            type="button"
                            onClick={() => { signOut({ callbackUrl: '/' }); setDropdownOpen(false); onAction?.() }}
                            className={`${rowBase} w-full text-[var(--sc-accent-deep)] hover:opacity-80`}
                        >
                            <LogOut className="h-4 w-4" />
                            {t('logout')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Not logged in
    return (
        <Link href="/login" onClick={onAction} className="sc-btn sc-btn--primary">
            {t('login')}
        </Link>
    )
}

function getInitials(name?: string | null, email?: string | null): string {
    if (name) {
        const parts = name.trim().split(/\s+/)
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase()
    }
    if (email) return email.slice(0, 2).toUpperCase()
    return '?'
}
