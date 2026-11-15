import { test, expect, type Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { randomUUID } from 'node:crypto'
import { routing } from '../src/i8n/routing'
import { languageNames } from '../src/i8n/locales'
import { baseURL, isolatedEnvironment } from './isolated-environment.mjs'

const codes = [...routing.locales.filter((locale) => locale !== 'en'), 'en'] as const
const names = codes.map((locale) => languageNames[locale])

async function chooseLanguage(page: Page, currentName: string, nextName: string) {
    await page
        .getByRole('button', {
            name: new RegExp(currentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        })
        .click()
    await page.getByRole('link', { name: nextName, exact: true }).click()
}

test('all languages, repeated selections, search parameters, hash, and current-language no-op', async ({
    page,
}) => {
    await page.goto('/crafts?q=blue%20cloth&tag=a&tag=b&page=2#collection')
    let current = 'English'
    for (let i = 0; i < names.length; i++) {
        await chooseLanguage(page, current, names[i])
        await expect(page.locator('html')).toHaveAttribute('lang', codes[i])
        const url = new URL(page.url())
        expect(url.pathname).toBe(codes[i] === 'en' ? '/crafts' : '/' + codes[i] + '/crafts')
        // The locale redirect may normalize spaces from %20 to +. Values,
        // ordering, and repeated parameters must remain intact.
        expect([...url.searchParams]).toEqual([
            ['q', 'blue cloth'],
            ['tag', 'a'],
            ['tag', 'b'],
            ['page', '2'],
        ])
        expect(url.hash).toBe('#collection')
        current = names[i]
    }
    await chooseLanguage(page, 'English', 'Türkçe')
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
    await chooseLanguage(page, 'Türkçe', 'English')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    // A same-language selection must not reload, even on a screen with work.
    await page.goto('/register')
    await page.getByLabel('Full Name', { exact: true }).fill('Unsaved local name')
    let dialogs = 0
    page.on('dialog', async (dialog) => {
        dialogs++
        await dialog.dismiss()
    })
    await chooseLanguage(page, 'English', 'English')
    await expect(page.getByLabel('Full Name', { exact: true })).toHaveValue('Unsaved local name')
    expect(dialogs).toBe(0)
})

test('cancel retains unsaved input and language; confirm navigates', async ({ page }) => {
    await page.goto('/register?invite=test#account')
    await page.getByLabel('Full Name', { exact: true }).fill('Unsaved local name')
    const beforeCookies = await page.context().cookies()
    page.once('dialog', (dialog) => dialog.dismiss())
    await chooseLanguage(page, 'English', 'Deutsch')
    await expect(page.getByLabel('Full Name', { exact: true })).toHaveValue('Unsaved local name')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    expect((await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE')?.value).toBe(
        beforeCookies.find((c) => c.name === 'NEXT_LOCALE')?.value,
    )
    page.once('dialog', (dialog) => dialog.accept())
    await chooseLanguage(page, 'English', 'Deutsch')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    expect(new URL(page.url()).search).toBe('?invite=test')
    expect(new URL(page.url()).hash).toBe('#account')
})

test('desktop keyboard selection and mobile menu support native names', async ({
    page,
}, testInfo) => {
    await page.goto('/')
    const trigger = page.getByRole('button', { name: /Current language: English/ })
    await trigger.focus()
    await trigger.press('Enter')
    const german = page.getByRole('link', { name: 'Deutsch', exact: true })
    await german.focus()
    await german.press('Enter')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await page.screenshot({ path: testInfo.outputPath('desktop-german.png'), fullPage: false })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Menü öffnen', exact: true }).click()
    await chooseLanguage(page, 'Deutsch', 'العربية')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click()
    await page.getByRole('button', { name: /العربية/ }).click()
    await expect(page.getByRole('link', { name: 'العربية', exact: true })).toHaveAttribute(
        'aria-current',
        'true',
    )
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: testInfo.outputPath('mobile-arabic-menu.png'), fullPage: false })
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
})

test('authenticated craft editing retains the craft ID through a confirmed switch', async ({
    page,
}) => {
    const environment = isolatedEnvironment()
    const prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: environment.DATABASE_URL_APP }),
    })
    const email = `language-e2e-${randomUUID()}@example.invalid`
    let userId: string | undefined
    try {
        const response = await page.request.post(`${baseURL}/api/auth/sign-up/email`, {
            headers: { Origin: baseURL },
            data: { name: 'Language Test', email, password: `Local-test-${randomUUID()}` },
        })
        expect(response.ok()).toBe(true)
        const payload = await response.json()
        userId = payload.user.id
        const artisan = await prisma.artisan.create({
            data: {
                userId: userId!,
                firstName: 'Language',
                lastName: 'Test',
                slug: `language-test-${randomUUID()}`,
            },
        })
        const craft = await prisma.craft.create({
            data: { artisanId: artisan.id, title: 'Local language test craft', isPublic: false },
        })
        await page.goto(`/crafts/create?id=${craft.id}#review`)
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Edit')
        page.once('dialog', (dialog) => dialog.accept())
        await chooseLanguage(page, 'English', 'Türkçe')
        await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
        expect(new URL(page.url()).searchParams.get('id')).toBe(craft.id)
        expect(new URL(page.url()).hash).toBe('#review')
        await expect(page.getByText('Local language test craft', { exact: true })).toBeVisible()
        expect(await prisma.craft.count({ where: { artisanId: artisan.id } })).toBe(1)
    } finally {
        // Only this test's exact synthetic account; related fixtures cascade.
        const user = userId ? { id: userId } : { email }
        await prisma.user.deleteMany({ where: user })
        await prisma.$disconnect()
    }
})
