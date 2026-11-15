import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    editorialPaths,
    listingMetadata,
    pageNumber,
    publicMetadata,
    publicUrl,
    seoOrigin,
} from '@/i8n/seo'
import { routing } from '@/i8n/routing'

afterEach(() => vi.unstubAllEnvs())

describe('public URL and indexing policy', () => {
    it('keeps English and QR destinations unchanged while adding non-English prefixes', () => {
        vi.stubEnv('SITE_URL', 'https://sustainablecrafting.org')
        expect(publicUrl('/crafts/record')).toBe('https://sustainablecrafting.org/crafts/record')
        expect(publicUrl('/about', 'tr')).toBe('https://sustainablecrafting.org/tr/about')
    })
    it.each([
        'https://example.org/path',
        'https://user:password@example.org',
        'https://example.org?q=1',
        'javascript:alert(1)',
    ])('rejects an invalid canonical origin %s', (value) => {
        vi.stubEnv('SITE_URL', value)
        expect(() => seoOrigin()).toThrow()
    })
    it.each(editorialPaths)(
        'provides reciprocal language variants and matching canonicals for %s',
        (path) => {
            for (const locale of routing.locales) {
                const metadata = publicMetadata(path, locale, 'Title', 'Description', true)
                expect(metadata.alternates?.canonical).toBe(publicUrl(path, locale))
                expect(metadata.alternates?.languages).toEqual(
                    Object.fromEntries([
                        ...routing.locales.map((code) => [code, publicUrl(path, code)]),
                        ['x-default', publicUrl(path)],
                    ]),
                )
            }
        },
    )
    it('keeps untranslated content on one canonical without claiming extra translations', () => {
        const metadata = publicMetadata(
            '/artisans/example',
            'ar',
            'Original name',
            'Original biography',
        )
        expect(metadata.alternates?.canonical).toBe(publicUrl('/artisans/example'))
        expect(metadata.alternates?.languages).toBeUndefined()
    })
    it('keeps distinct paginated URLs and excludes search results from indexing', () => {
        const page = listingMetadata('/crafts', 'tr', 'Title', 'Description', { page: '2' })
        expect(page.alternates?.canonical).toBe(publicUrl('/crafts?page=2'))
        const search = listingMetadata('/crafts', 'tr', 'Title', 'Description', { q: 'basket' })
        expect(search.robots).toEqual({ index: false, follow: true })
        expect(search.alternates).toBeUndefined()
    })
    it.each(['bad', '-3', '0', 'Infinity', '1.5', '99999999999999999999'])(
        'normalizes invalid page value %s',
        (value) => {
            expect(pageNumber(value)).toBe(1)
        },
    )
})
