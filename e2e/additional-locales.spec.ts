import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { routing } from '../src/i8n/routing'
import { languageNames } from '../src/i8n/locales'
import { baseURL } from './isolated-environment.mjs'

for (const locale of ['ja', 'fr', 'it', 'pt-BR'] as const) {
    test(
        locale + ' has translated pages, form validation, SEO and usable mobile selection',
        async ({ page }, testInfo) => {
            const messages = JSON.parse(readFileSync('messages/' + locale + '.json', 'utf8'))
            const errors: string[] = []
            page.on('console', (message) => {
                if (
                    /MISSING_MESSAGE|FORMATTING_ERROR|INVALID_MESSAGE|Hydration failed/.test(
                        message.text(),
                    )
                )
                    errors.push(message.text())
            })
            await page.setViewportSize({ width: 1440, height: 1000 })
            await page.goto('/' + locale)
            await expect(page.locator('html')).toHaveAttribute('lang', locale)
            await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
            await expect(page.getByRole('heading', { level: 1 })).not.toContainText(
                'Every handcrafted product',
            )
            await page.evaluate(() => document.fonts.ready)
            expect(
                await page.evaluate(
                    () => document.documentElement.scrollWidth <= window.innerWidth,
                ),
            ).toBe(true)
            if (locale === 'ja') {
                const japaneseFontLoaded = await page.evaluate(async () => {
                    const family = getComputedStyle(document.querySelector('h1')!).fontFamily
                    const fonts = await document.fonts.load('16px ' + family, '日本語')
                    return family.includes('Noto') && fonts.some((font) => font.status === 'loaded')
                })
                expect(japaneseFontLoaded).toBe(true)
            }
            await page.screenshot({
                path: testInfo.outputPath(locale + '-desktop.png'),
                fullPage: false,
            })
            await page.goto('/' + locale + '/about')
            await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.about.title)
            await expect(
                page.getByText(messages.about.missionDescription, { exact: true }),
            ).toBeVisible()
            await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
                'href',
                baseURL + '/' + locale + '/about',
            )
            await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(
                routing.locales.length + 1,
            )
            for (const other of routing.locales) {
                await expect(page.locator('link[hreflang="' + other + '"]')).toHaveAttribute(
                    'href',
                    baseURL + (other === 'en' ? '' : '/' + other) + '/about',
                )
            }
            await page.goto('/' + locale + '/privacy')
            await expect(
                page.getByText(messages.interface.legalEnglishOnly, { exact: true }),
            ).toBeVisible()
            await expect(page.locator('article')).toHaveAttribute('lang', 'en')
            await page.goto('/' + locale + '/register')
            let signups = 0
            await page.route('**/api/auth/sign-up/email', async (route) => {
                signups++
                await route.fulfill({ status: 400, json: { error: 'Unexpected test submission' } })
            })
            await page.getByLabel(messages.auth.name, { exact: true }).fill('Local Test')
            await page
                .getByLabel(messages.auth.email, { exact: true })
                .fill('local@example.invalid')
            await page.getByLabel(messages.auth.password, { exact: true }).fill('short')
            await page.getByLabel(messages.auth.confirmPassword, { exact: true }).fill('short')
            await page.locator('#acceptTerms').check()
            await page.getByRole('button', { name: messages.auth.register, exact: true }).click()
            await expect(
                page.getByText(messages.auth.validation.passwordMin, { exact: true }),
            ).toBeVisible()
            expect(signups).toBe(0)
            await page.setViewportSize({ width: 390, height: 667 })
            await page.goto('/' + locale)
            await page.evaluate(() => document.fonts.ready)
            expect(
                await page.evaluate(
                    () => document.documentElement.scrollWidth <= window.innerWidth,
                ),
            ).toBe(true)
            await page.screenshot({
                path: testInfo.outputPath(locale + '-mobile.png'),
                fullPage: false,
            })
            await page
                .getByRole('button', { name: messages.interface.openMenu, exact: true })
                .click()
            await page.getByRole('dialog').locator('summary').click()
            const selected = page.getByRole('link', { name: languageNames[locale], exact: true })
            await selected.scrollIntoViewIfNeeded()
            await expect(selected).toHaveAttribute('aria-current', 'true')
            await page.getByRole('link', { name: 'English', exact: true }).click()
            await expect(page.locator('html')).toHaveAttribute('lang', 'en')
            expect(errors).toEqual([])
        },
    )
}
