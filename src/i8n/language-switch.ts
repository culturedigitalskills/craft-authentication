import { getPathname } from './navigation'
import type { SiteLocale } from './locales'

export { languageNames } from './locales'
export type { SiteLocale } from './locales'

/**
 * Build a stable locale URL, retaining repeated query parameters and fragments.
 * Document navigation intentionally uses the unsaved-work confirmation below.
 */
export function languageSwitchHref(
    pathname: string,
    search: string,
    hash: string,
    locale: SiteLocale,
): string {
    return getPathname({ href: `${pathname}${search}${hash}`, locale })
}

/**
 * These screens can hold local-only form state, files or recordings. Until
 * per-form draft preservation is available, ask before reloading them. This is
 * deliberately conservative: autosaving text does not mean an upload is saved.
 */
export function languageSwitchNeedsConfirmation(pathname: string): boolean {
    const roots = [
        '/login',
        '/register',
        '/profile',
        '/onboarding',
        '/crafts/create',
        '/groups/create',
        '/media-gallery',
        '/content-credentials',
        '/generation-workspace',
    ]
    return (
        roots.some((root) => pathname === root || pathname.startsWith(`${root}/`)) ||
        /^\/groups\/[^/]+\/manage(?:\/|$)/.test(pathname)
    )
}
