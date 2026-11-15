import { getPathname } from './navigation'
import { routing } from './routing'

export type SiteLocale = (typeof routing.locales)[number]

export const languageNames: Record<SiteLocale, string> = {
    en: 'English',
    hi: 'हिन्दी',
    es: 'Español',
    ar: 'العربية',
    de: 'Deutsch',
    tr: 'Türkçe',
    el: 'Ελληνικά',
}

/**
 * An explicit locale prefix lets the middleware set its locale cookie before
 * rendering. A document navigation avoids replaying the previous language from
 * Next's cache while localePrefix is "never". Reuse the routing API so this also
 * works when the planned stable locale URLs are enabled.
 *
 * Keep the browser's raw search string: parsing to an object loses repeated
 * parameters, and passing only pathname loses searches, pages and edit IDs.
 */
export function languageSwitchHref(
    pathname: string,
    search: string,
    hash: string,
    locale: SiteLocale,
): string {
    return getPathname({ href: `${pathname}${search}${hash}`, locale, forcePrefix: true })
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
    return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`)) ||
        /^\/groups\/[^/]+\/manage(?:\/|$)/.test(pathname)
}
