import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { baseURL, isolatedEnvironment } from './isolated-environment.mjs'

test('Arabic account workflows render translated controls, verify a real invalid fixture, and keep content unchanged', async ({
    page,
}, testInfo) => {
    const env = isolatedEnvironment()
    const prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: env.DATABASE_URL_APP }),
    })
    const email = 'workflow-e2e-' + randomUUID() + '@example.invalid'
    const errors: string[] = []
    page.on('console', (message) => {
        if (/MISSING_MESSAGE|FORMATTING_ERROR|INVALID_MESSAGE/.test(message.text()))
            errors.push(message.text())
    })
    let userId: string | undefined
    try {
        const response = await page.request.post(baseURL + '/api/auth/sign-up/email', {
            headers: { Origin: baseURL },
            data: { name: 'Workflow Test', email, password: 'Local-test-' + randomUUID() },
        })
        expect(response.ok()).toBe(true)
        const account = await response.json()
        userId = account.user.id
        const artisan = await prisma.artisan.create({
            data: {
                userId: userId!,
                firstName: 'Workflow',
                lastName: 'Test',
                slug: 'workflow-' + randomUUID(),
                bio: 'Authored text stays original.',
            },
        })
        const group = await prisma.group.create({
            data: {
                name: 'Local workflow group',
                slug: 'workflow-group-' + randomUUID(),
                memberships: { create: { artisanId: artisan.id, role: 'ADMIN' } },
            },
        })
        try {
            await page.setViewportSize({ width: 390, height: 844 })
            for (const route of [
                '/ar/profile',
                '/ar/crafts/create',
                '/ar/groups/' + group.slug + '/manage',
                '/ar/media-gallery',
                '/ar/generation-workspace',
            ]) {
                await page.goto(route)
                await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
                await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
                await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
                    'content',
                    /noindex/,
                )
                expect(
                    await page.evaluate(
                        () => document.documentElement.scrollWidth <= window.innerWidth,
                    ),
                ).toBe(true)
            }
            await page.goto('/ar/content-credentials')
            await page.getByRole('button', { name: 'إعداد الخزنة الآمنة', exact: true }).click()
            await expect(page.getByRole('dialog')).toBeVisible()
            await expect(
                page.getByRole('heading', { name: 'احمِ مفاتيح API الخاصة بك', exact: true }),
            ).toBeVisible()
            await page.evaluate(() => document.fonts.ready)
            await page.screenshot({
                path: testInfo.outputPath('arabic-vault-intro.png'),
                fullPage: false,
            })
            // Stop before generating any recovery secret; this is a UI localization check.
            await page
                .getByRole('dialog')
                .getByRole('button', { name: 'إغلاق', exact: true })
                .click()
            await expect(page.getByRole('dialog')).not.toBeVisible()
            await expect(page.locator('input[type="file"]')).toHaveCount(1)
            await page
                .locator('input[type="file"]')
                .setInputFiles('public/test/test_cr_with_manifest.png')
            await expect(
                page.getByRole('heading', { name: 'تم العثور على مشاكل في التوقيع', exact: true }),
            ).toBeVisible()
            expect(errors).toEqual([])
            expect((await prisma.artisan.findUnique({ where: { id: artisan.id } }))?.bio).toBe(
                'Authored text stays original.',
            )
        } finally {
            await prisma.group.delete({ where: { id: group.id } })
        }
    } finally {
        await prisma.user.deleteMany({ where: userId ? { id: userId } : { email } })
        await prisma.$disconnect()
    }
})

test('long translated navigation stays usable at desktop and intermediate widths', async ({
    page,
}, testInfo) => {
    for (const locale of ['de', 'el', 'hi', 'ar', 'ja', 'fr', 'it', 'pt-BR']) {
        const messages = JSON.parse(readFileSync('messages/' + locale + '.json', 'utf8'))
        for (const width of [1100, 1440]) {
            await page.setViewportSize({ width, height: 1000 })
            await page.goto('/' + locale + '/about')
            if (width < 1280) {
                await page
                    .getByRole('button', { name: messages.interface.openMenu, exact: true })
                    .click()
                await expect(
                    page.getByRole('link', { name: messages.navbar.login, exact: true }),
                ).toBeVisible()
                await page
                    .getByRole('button', { name: messages.interface.closeMenu, exact: true })
                    .click()
            } else {
                await expect(
                    page
                        .locator('header')
                        .getByRole('link', { name: messages.navbar.login, exact: true }),
                ).toBeVisible()
            }
            const controls = page.locator('header a, header summary, header button')
            for (const control of await controls.all()) {
                if (!(await control.isVisible())) continue
                const box = await control.boundingBox()
                expect(box?.x).toBeGreaterThanOrEqual(0)
                expect((box?.x || 0) + (box?.width || 0)).toBeLessThanOrEqual(width + 1)
            }
        }
    }
    await page.goto('/de/about')
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
        path: testInfo.outputPath('german-desktop-about.png'),
        fullPage: false,
    })
})
