'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Button, buttonVariants } from '../ui/button'
import { useTranslations } from 'next-intl'

export function NavbarAuth() {
    const { data: session, status } = useSession()
    const t = useTranslations('navbar')

    if (status === 'loading') {
        return <div className="h-8 w-16 animate-pulse rounded bg-muted" />
    }

    if (session?.user) {
        return (
            <div className="flex items-center gap-4">
                <Link
                    href="/profile"
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    {t('profile')}
                </Link>
                <span className="text-sm text-muted-foreground">
                    {session.user.name || session.user.email}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: '/' })}
                >
                    {t('logout')}
                </Button>
            </div>
        )
    }

    return (
        <h3 className={buttonVariants({ variant: 'default' })}>
            <Link
                href="/login"
                className="text-1xl font-bold text-inherit hover:text-neutral-400"
            >
                {t('login')}
            </Link>
        </h3>
    )
}
