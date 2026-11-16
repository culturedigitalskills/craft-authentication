import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { createTranslator } from 'next-intl'
import { readFileSync } from 'node:fs'
import { routing } from '@/i8n/routing'
import {
    languageNames,
    languageSwitchHref,
    languageSwitchNeedsConfirmation,
} from '@/i8n/language-switch'

const middleware = createMiddleware(routing)

describe('language selection navigation', () => {
    it('keeps edit IDs, duplicate search parameters, encoding, pagination and fragment', () => {
        const href = languageSwitchHref(
            '/crafts/create',
            '?id=craft-123&q=blue%20cloth&tag=a&tag=b&page=2',
            '#review',
            'tr',
        )
        expect(href).toBe('/tr/crafts/create?id=craft-123&q=blue%20cloth&tag=a&tag=b&page=2#review')
    })

    it.each(routing.locales)(
        'serves the URL-selected %s locale despite cookies and browser preferences',
        (locale) => {
            const href = languageSwitchHref('/crafts', '?q=cloth&page=2', '', locale)
            const response = middleware(
                new NextRequest('http://localhost:20200' + href, {
                    headers: { cookie: 'NEXT_LOCALE=de', 'accept-language': 'ar' },
                }),
            )
            expect(response.status).toBe(200)
            expect(response.headers.get('location')).toBeNull()
            const rewritten = new URL(
                response.headers.get('x-middleware-rewrite') || 'http://localhost:20200' + href,
            )
            expect(rewritten.pathname).toBe('/' + locale + '/crafts')
            expect(rewritten.searchParams.get('q')).toBe('cloth')
            expect(rewritten.searchParams.get('page')).toBe('2')
        },
    )

    it('normalizes legacy English prefixes without losing query parameters', () => {
        const response = middleware(
            new NextRequest('http://localhost:20200/en/crafts?id=123&tag=a&tag=b'),
        )
        expect(response.status).toBe(307)
        const target = new URL(response.headers.get('location')!)
        expect(target.pathname).toBe('/crafts')
        expect(target.searchParams.getAll('tag')).toEqual(['a', 'b'])
        expect(target.searchParams.get('id')).toBe('123')
    })

    it.each([
        '/crafts/create',
        '/profile',
        '/onboarding/story',
        '/groups/team/manage',
        '/groups/create',
        '/register',
        '/login',
        '/media-gallery',
        '/content-credentials',
        '/generation-workspace',
    ])('protects possible unsaved work on %s', (path) => {
        expect(languageSwitchNeedsConfirmation(path)).toBe(true)
    })

    it.each(['/', '/crafts', '/crafts/mycrafts', '/artisans/someone', '/groups/team', '/about'])(
        'does not interrupt browsing on %s',
        (path) => {
            expect(languageSwitchNeedsConfirmation(path)).toBe(false)
        },
    )
})

describe('language selector messages', () => {
    it.each(routing.locales)('has usable selector copy in %s', (locale) => {
        const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'))
        const t = createTranslator({
            locale,
            messages,
            namespace: 'languageSelector',
            onError(error) {
                throw error
            },
        })
        expect(t('label', { language: languageNames[locale] })).toContain(languageNames[locale])
        expect(t('menu')).toBeTruthy()
        expect(t('confirmChange')).toBeTruthy()
    })
})
