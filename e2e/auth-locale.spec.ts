import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { baseURL, isolatedEnvironment } from './isolated-environment.mjs'

test('Google login and registration send locale-aware callbacks and recover from provider failure', async ({
    page,
}) => {
    let callback = ''
    await page.route('**/api/auth/sign-in/social', async (route) => {
        callback = route.request().postDataJSON().callbackURL
        await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
                code: 'TEST_PROVIDER_UNAVAILABLE',
                message: 'Test-only provider failure',
            }),
        })
    })
    for (const [locale, path] of [
        ['tr', 'login'],
        ['ar', 'register'],
    ]) {
        const messages = JSON.parse(readFileSync('messages/' + locale + '.json', 'utf8'))
        await page.goto('/' + locale + '/' + path)
        const google = page.getByRole('button', { name: /Google/ })
        if (path === 'register') {
            await expect(google).toBeDisabled()
            await page.getByRole('checkbox').check()
        }
        await google.click()
        await expect(
            page.getByText(messages.interface.requestFailed, { exact: true }),
        ).toBeVisible()
        await expect(google).toBeEnabled()
        expect(callback).toBe('/' + locale + '/auth/redirect')
        expect(await page.locator('main').innerText()).not.toContain('Test-only provider failure')
    }
})

test('credential login and account navigation keep the selected language', async ({ page }) => {
    const env = isolatedEnvironment()
    const prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: env.DATABASE_URL_APP }),
    })
    const email = 'locale-login-' + randomUUID() + '@example.invalid'
    const password = 'Local-test-' + randomUUID()
    const messages = JSON.parse(readFileSync('messages/tr.json', 'utf8'))
    let userId: string | undefined
    try {
        const created = await page.request.post(baseURL + '/api/auth/sign-up/email', {
            headers: { Origin: baseURL },
            data: { name: 'Locale Login', email, password },
        })
        expect(created.ok()).toBe(true)
        userId = (await created.json()).user.id
        await prisma.artisan.create({
            data: {
                userId: userId!,
                firstName: 'Locale',
                lastName: 'Login',
                slug: 'locale-login-' + randomUUID(),
            },
        })
        await page.request.post(baseURL + '/api/auth/sign-out', { headers: { Origin: baseURL } })
        await page.goto('/tr/login')
        await page.getByLabel(messages.auth.email, { exact: true }).fill(email)
        await page.getByLabel(messages.auth.password, { exact: true }).fill(password)
        await page.locator('form button[type="submit"]').click()
        await expect(page).toHaveURL(baseURL + '/tr/crafts')
        await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
        const account = page.locator('header button.sc-avatar')
        await expect(account).toContainText('LL')
        await account.click()
        await expect(
            page.getByRole('link', { name: messages.navbar.profile, exact: true }),
        ).toHaveAttribute('href', '/tr/profile')
    } finally {
        await prisma.user.deleteMany({ where: userId ? { id: userId } : { email } })
        await prisma.$disconnect()
    }
})
