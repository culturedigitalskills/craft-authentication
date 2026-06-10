'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { User, LogOut, FolderOpen, FolderUp, Users, UserPlus, BookOpen } from 'lucide-react'
import { Button } from '../ui/button'
import { useTranslations } from 'next-intl'

interface NavbarAuthProps {
    onAction?: () => void
    variant?: 'desktop' | 'mobile'
}

// Static warm underline shown under the label of the *selected* dropdown item,
// mirroring the active-link indicator in the main navbar.
const activeUnderline =
    'relative after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-warm'
export function NavbarAuth({ onAction, variant = 'desktop' }: NavbarAuthProps) {
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
        return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
    }

    // ── Mobile layout: stacked links ──
    if (variant === 'mobile') {
        if (session?.user) {
            return (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                            {getInitials(session.user.name, session.user.email)}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                                {session.user.name || session.user.email}
                            </p>
                            {session.user.name && session.user.email && (
                                <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
                            )}
                        </div>
                    </div>
                    <Link
                        href="/profile"
                        onClick={onAction}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                        <User className="h-4 w-4" />
                        {t('profile')}
                    </Link>
                    <Link
                        href="/crafts/mycrafts"
                        onClick={onAction}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                        <FolderOpen className="h-4 w-4" />
                        {t('myitems')}
                    </Link>      
                    <Link
                        href="/crafts/create"
                        onClick={onAction}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                        <FolderUp className="h-4 w-4" />
                        {t('addcraft')}
                    </Link>
                    <Link
                        href="/onboarding/story"
                        onClick={onAction}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                        <BookOpen className="h-4 w-4" />
                        {t('mystory')}
                    </Link>

                    <div className="my-1 border-t border-border" />

                    <Link
                        href="/groups/mygroups"
                        onClick={onAction}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                        <Users className="h-4 w-4" />
                        {t('mygroups')}
                    </Link>
                    <Link
                        href="/groups/create"
                        onClick={onAction}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                        <UserPlus className="h-4 w-4" />
                        {t('createGroup')}
                    </Link>
                    <button
                        type="button"
                        onClick={() => { signOut({ callbackUrl: '/' }); onAction?.() }}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                        <LogOut className="h-4 w-4" />
                        {t('logout')}
                    </button>
                </div>
            )
        }

        return (
            <Link
                href="/login"
                onClick={onAction}
                className="inline-flex items-center justify-center rounded-md bg-warm px-4 py-2.5 text-sm font-medium text-warm-foreground transition-colors hover:bg-warm/90"
            >
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
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white ring-2 ring-transparent transition-all hover:ring-primary/30"
                >
                    {getInitials(session.user.name, session.user.email)}
                </button>

                {/* Dropdown */}
                <div
                    className={`absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-lg border border-border bg-background shadow-lg transition-all ${
                        dropdownOpen
                            ? 'visible translate-y-0 opacity-100'
                            : 'invisible -translate-y-1 opacity-0'
                    }`}
                >
                    {/* User info */}
                    <div className="border-b border-border px-4 py-3">
                        <p className="truncate text-sm font-medium text-foreground">
                            {session.user.name || session.user.email}
                        </p>
                        {session.user.name && session.user.email && (
                            <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
                        )}
                    </div>

                    {/* Account links */}
                    <div className="py-1">
                        <Link
                            href="/profile"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors duration-200 ${isActive('/profile') ? 'text-warm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <User className="h-4 w-4" />
                            <span className={isActive('/profile') ? activeUnderline : ''}>{t('profile')}</span>
                        </Link>
                        <Link
                            href="/crafts/mycrafts"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors duration-200 ${isActive('/crafts/mycrafts') ? 'text-warm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <FolderOpen className="h-4 w-4" />
                            <span className={isActive('/crafts/mycrafts') ? activeUnderline : ''}>{t('myitems')}</span>
                        </Link>
                        <Link
                            href="/crafts/create"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors duration-200 ${isActive('/crafts/create') ? 'text-warm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <FolderUp className="h-4 w-4" />
                            <span className={isActive('/crafts/create') ? activeUnderline : ''}>{t('addcraft')}</span>
                        </Link>
                        <Link
                            href="/onboarding/story"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors duration-200 ${isActive('/onboarding/story') ? 'text-warm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <BookOpen className="h-4 w-4" />
                            <span className={isActive('/onboarding/story') ? activeUnderline : ''}>{t('mystory')}</span>
                        </Link>
                    </div>

                    {/* Groups */}
                    <div className="border-t border-border py-1">
                        <Link
                            href="/groups/mygroups"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors duration-200 ${isActive('/groups/mygroups') ? 'text-warm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Users className="h-4 w-4" />
                            <span className={isActive('/groups/mygroups') ? activeUnderline : ''}>{t('mygroups')}</span>
                        </Link>
                        <Link
                            href="/groups/create"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors duration-200 ${isActive('/groups/create') ? 'text-warm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <UserPlus className="h-4 w-4" />
                            <span className={isActive('/groups/create') ? activeUnderline : ''}>{t('createGroup')}</span>
                        </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-border py-1">
                        <button
                            type="button"
                            onClick={() => { signOut({ callbackUrl: '/' }); setDropdownOpen(false); onAction?.() }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
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
        <Button asChild size="sm">
            <Link href="/login" onClick={onAction}>
                {t('login')}
            </Link>
        </Button>
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
