'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { User, LogOut, FolderOpen, FolderUp, Users, UserPlus } from 'lucide-react'
import { Button } from '../ui/button'
import { useTranslations } from 'next-intl'

interface NavbarAuthProps {
    onAction?: () => void
    variant?: 'desktop' | 'mobile'
}
export function NavbarAuth({ onAction, variant = 'desktop' }: NavbarAuthProps) {
    const { data: session, status } = useSession()
    const t = useTranslations('navbar')
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

                    <div className="my-1 border-t border-border" />

                    <Link
                        href="/groups"
                        onClick={onAction}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                        <Users className="h-4 w-4" />
                        {t('groups')}
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
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
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
                    className={`absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-lg border border-border bg-white shadow-lg transition-all ${
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

                    {/* Links */}
                    <div className="py-1">
                        <Link
                            href="/profile"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                            <User className="h-4 w-4 text-muted-foreground" />
                            {t('profile')}
                        </Link>
                    </div>
                    {/* My items */}
                    <div className="py-1">
                        <Link
                            href="/crafts/mycrafts"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            {t('myitems')}
                        </Link>
                    </div>
                    {/* Add item */}
                    <div className="py-1">
                        <Link
                            href="/crafts/create"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                            <FolderUp className="h-4 w-4 text-muted-foreground" />
                            {t('addcraft')}
                        </Link>
                    </div>

                    {/* Groups */}
                    <div className="border-t border-border py-1">
                        <Link
                            href="/groups"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {t('groups')}
                        </Link>
                        <Link
                            href="/groups/create"
                            onClick={() => { setDropdownOpen(false); onAction?.() }}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                            {t('createGroup')}
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
