import type { Metadata } from 'next'
import { routing } from './routing'
import { getPathname } from './navigation'
import type { SiteLocale } from './language-switch'

export const editorialPaths = ['/', '/about', '/how-it-works'] as const

/** Use deployment configuration, never a request Host header, for public URLs. */
export function seoOrigin(): string {
    const value =
        process.env.SITE_URL ||
        process.env.NEXT_PUBLIC_SERVER_URL ||
        process.env.AUTH_URL ||
        'https://sustainablecrafting.org'
    const url = new URL(value)
    if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== '/'
    ) {
        throw new Error(
            'SITE_URL must be an http(s) origin without credentials, path, query or fragment',
        )
    }
    return url.origin
}

export function publicUrl(path: string, locale: SiteLocale = 'en'): string {
    return new URL(getPathname({ href: path, locale }), seoOrigin()).href
}

export function publicMetadata(
    path: string,
    locale: SiteLocale,
    title: string,
    description?: string,
    translated = false,
): Metadata {
    const canonical = publicUrl(path, translated ? locale : 'en')
    return {
        title: path === '/' ? { absolute: title } : title,
        description,
        robots: { index: true, follow: true },
        alternates: {
            canonical,
            ...(translated
                ? {
                      languages: Object.fromEntries([
                          ...routing.locales.map((code) => [code, publicUrl(path, code)]),
                          ['x-default', publicUrl(path)],
                      ]),
                  }
                : {}),
        },
        openGraph: { title, description, url: canonical, type: 'website' },
        twitter: { card: 'summary', title, description },
    }
}

export type ListingQuery = { page?: string | string[]; q?: string | string[] }

export function firstSearchValue(value?: string | string[]): string {
    return Array.isArray(value) ? value[0] || '' : value || ''
}

export function pageNumber(input?: string | string[]): number {
    const value = firstSearchValue(input)
    if (!value || !/^\d+$/.test(value)) return 1
    const page = Number(value)
    return Number.isSafeInteger(page) && page > 0 ? page : 1
}

export function listingMetadata(
    path: string,
    locale: SiteLocale,
    title: string,
    description: string,
    query: ListingQuery,
): Metadata {
    if (firstSearchValue(query.q).trim())
        return { title, description, robots: { index: false, follow: true } }
    const page = pageNumber(query.page)
    return publicMetadata(path + (page > 1 ? '?page=' + page : ''), locale, title, description)
}
