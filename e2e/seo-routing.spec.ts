import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { baseURL, isolatedEnvironment } from './isolated-environment.mjs'

test('explicit URLs ignore conflicting browser and cookie preferences and publish matching alternates', async ({
    page,
    request,
}) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'ar', url: baseURL }])
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'de-DE,de;q=0.9' })
    await page.goto('/tr/about')
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
    expect(new URL(page.url()).pathname).toBe('/tr/about')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        baseURL + '/tr/about',
    )
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(8)
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', baseURL + '/about')
    await expect(page.locator('link[hreflang="ar"]')).toHaveAttribute('href', baseURL + '/ar/about')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
    await page.goto('/about')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    const legacy = await request.get('/en/about?q=keep', { maxRedirects: 0 })
    expect(legacy.status()).toBe(307)
    expect(new URL(legacy.headers().location, baseURL).pathname).toBe('/about')
    expect(new URL(legacy.headers().location, baseURL).searchParams.get('q')).toBe('keep')
})

test('public HTML contains ordinary language links and account, search and error screens are not indexed', async ({
    page,
    request,
}) => {
    const html = await (await request.get('/tr/about')).text()
    expect(html).toMatch(/href="\/ar\/about"/)
    for (const route of ['/tr/login', '/tr/register', '/tr/onboarding', '/tr/crafts?q=basket']) {
        await page.goto(route)
        await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
        await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
            'content',
            /noindex/,
        )
    }
    const redirect = await request.get('/tr/profile', { maxRedirects: 0 })
    expect(redirect.status()).toBe(307)
    expect(new URL(redirect.headers().location, baseURL).pathname).toBe('/tr/login')
    const missing = await page.goto('/ar/nonexistent-localization-test')
    expect(missing?.status()).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(
        page.getByRole('heading', { name: 'الصفحة غير موجودة', exact: true }),
    ).toBeVisible()
})

test('English legal content is labelled and links to verified contact pages when email settings are absent', async ({
    page,
}) => {
    await page.goto('/ar/privacy')
    await expect(page.locator('article')).toHaveAttribute('lang', 'en')
    await expect(page.locator('article')).toHaveAttribute('dir', 'ltr')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        baseURL + '/privacy',
    )
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0)
    await expect(
        page.getByText('هذا المستند متاح حاليًا باللغة الإنجليزية.', { exact: true }),
    ).toBeVisible()
    expect(await page.locator('article').innerText()).not.toContain('PLACEHOLDER')
    await expect(page.locator('article a').first()).toHaveAttribute('href', /brighton\.ac\.uk/)
})

test('original artisan content has one canonical and sitemap excludes private or removed records', async ({
    page,
    request,
}) => {
    const env = isolatedEnvironment()
    const prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: env.DATABASE_URL_APP }),
    })
    const email = 'seo-e2e-' + randomUUID() + '@example.invalid'
    let userId: string | undefined
    try {
        const user = await prisma.user.create({
            data: { email, name: 'SEO test', role: 'ARTISAN' },
        })
        userId = user.id
        const artisan = await prisma.artisan.create({
            data: {
                userId,
                firstName: 'Original',
                lastName: 'Artisan',
                slug: 'seo-' + randomUUID(),
                bio: 'Original biography remains unchanged.',
            },
        })
        const published = await prisma.craft.create({
            data: {
                artisanId: artisan.id,
                title: 'Orijinal ürün başlığı',
                description: 'Original description.',
                isPublic: true,
            },
        })
        const privateCraft = await prisma.craft.create({
            data: { artisanId: artisan.id, title: 'Private fixture', isPublic: false },
        })
        await page.goto('/ar/artisans/' + artisan.slug)
        await expect(
            page.getByText('Original biography remains unchanged.', { exact: true }),
        ).toBeVisible()
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
            'href',
            baseURL + '/artisans/' + artisan.slug,
        )
        await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0)
        await page.goto('/tr/crafts/' + published.id)
        await expect(
            page.getByRole('heading', { name: published.title, exact: true }),
        ).toBeVisible()
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
            'href',
            baseURL + '/crafts/' + published.id,
        )
        const xml = await (await request.get('/sitemap.xml')).text()
        expect(xml).toContain('/tr/about')
        expect(xml).toContain('/crafts/' + published.id)
        expect(xml).not.toContain('/crafts/' + privateCraft.id)
        expect(xml).not.toContain('/profile')
        expect(xml).not.toContain('/ar/artisans/')
        await prisma.artisan.update({ where: { id: artisan.id }, data: { deletedAt: new Date() } })
        const after = await (await request.get('/sitemap.xml')).text()
        expect(after).not.toContain('/artisans/' + artisan.slug)
        expect(after).not.toContain('/crafts/' + published.id)
    } finally {
        if (userId) await prisma.user.deleteMany({ where: { id: userId } })
        await prisma.$disconnect()
    }
})

test('health route returns JSON without locale redirects', async ({ request }) => {
    const response = await request.get('/health', {
        headers: { Cookie: 'NEXT_LOCALE=ar', 'Accept-Language': 'de' },
        maxRedirects: 0,
    })
    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ status: 'healthy' })
    expect(response.headers()['x-robots-tag']).toContain('noindex')
})
