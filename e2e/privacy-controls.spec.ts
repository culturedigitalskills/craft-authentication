import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { baseURL, isolatedEnvironment } from './isolated-environment.mjs'

test('privacy choices govern location, credentials and external captions', async ({
    page,
    browser,
}) => {
    test.setTimeout(180_000)
    const db = new PrismaClient({
        adapter: new PrismaPg({ connectionString: isolatedEnvironment().DATABASE_URL_APP }),
    })
    const visitor = await browser.newContext({ baseURL })
    const id = randomUUID()
    const headers = { Origin: baseURL }
    let userId: string | undefined
    let craftId: string | undefined
    let mediaId: string | undefined
    try {
        const signup = await page.request.post('/api/auth/sign-up/email', {
            headers,
            data: {
                name: 'Privacy fixture',
                email: id + '@example.invalid',
                password: 'Fixture-' + id,
            },
        })
        expect(signup.ok()).toBe(true)
        userId = (await signup.json()).user.id
        const artisan = await db.artisan.create({
            data: { userId: userId!, firstName: 'Privacy', lastName: 'Fixture', slug: id },
        })
        const record = await page.request.post('/api/crafts', {
            headers,
            data: { title: 'Test piece' },
        })
        expect(record.status()).toBe(201)
        const craft = await record.json()
        craftId = craft.id
        expect(craft.isSharedLocation).toBe(false)
        expect((await page.request.get('/api/vc/' + craftId)).status()).toBe(200)
        expect((await visitor.request.get('/api/vc/' + craftId)).status()).toBe(404)
        const update = await page.request.put('/api/crafts/' + craftId, {
            headers,
            data: {
                isPublic: true,
                isSharedLocation: true,
                latitude: 51.58372,
                longitude: -0.28413,
                place: 'Test locality',
            },
        })
        expect(update.ok()).toBe(true)
        expect((await visitor.request.get('/api/vc/' + craftId)).status()).toBe(200)
        expect(await (await visitor.request.get('/api/crafts/' + craftId)).json()).toMatchObject({
            latitude: 51.6,
            longitude: -0.3,
        })
        await db.craft.update({
            where: { id: craftId },
            data: { latitude: 51.58372, longitude: -0.28413 },
        })
        expect(await (await visitor.request.get('/api/crafts/' + craftId)).json()).toMatchObject({
            latitude: 51.6,
            longitude: -0.3,
        })
        await page.request.put('/api/crafts/' + craftId, {
            headers,
            data: { isSharedLocation: false },
        })
        expect(await db.craft.findUnique({ where: { id: craftId } })).toMatchObject({
            latitude: null,
            longitude: null,
            place: null,
        })
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto('/crafts/create')
        await page.locator('#title').fill('New local test piece')
        await page.locator('#description').fill('An example description.')
        for (let i = 0; i < 5; i++) await page.getByRole('button', { name: /^next$/i }).click()
        await expect(page.locator('#isSharedLocation')).not.toBeChecked()
        let lookup = ''
        await page.context().grantPermissions(['geolocation'])
        await page.context().setGeolocation({ latitude: 51.58372, longitude: -0.28413 })
        await page.route('**/api/geocode?*', async (route) => {
            lookup = new URL(route.request().url()).search
            await route.fulfill({ json: { city: 'Test locality' } })
        })
        await page.locator('#isSharedLocation').check()
        await expect.poll(() => lookup).toBe('?lat=51.6&lng=-0.3')
        await page.locator('#isSharedLocation').uncheck()
        await page.goto('/privacy')
        await expect(
            page.getByText(/project keeps the records so the profile can be restored/),
        ).toBeVisible()
        await page.goto('/terms')
        await expect(
            page.getByText(/Removal keeps the profile, crafts and story available for restoration/),
        ).toBeVisible()
        await page.goto('/generation-workspace')
        await expect(
            page.getByText(/OpenRouter and the selected model provider receive your prompt/),
        ).toBeVisible()
        const media = await db.mediaFile.create({
            data: {
                filename: id,
                originalName: 'voice.wav',
                mimeType: 'audio/wav',
                size: 1,
                bucket: 'test',
                objectKey: id,
                uploaderId: userId,
            },
        })
        mediaId = media.id
        expect(
            (
                await page.request.put('/api/artisans/me/story', {
                    headers,
                    data: { lastStepReached: 8, answerSelfMediaId: mediaId },
                })
            ).ok(),
        ).toBe(true)
        expect(await db.mediaTranscript.count({ where: { mediaId } })).toBe(0)
        await page.goto('/onboarding/story')
        const action = page.getByRole('button', { name: 'Send audio to Groq for captions' })
        await expect(action).toBeVisible()
        await expect(page.getByText(/You can publish without captions/)).toBeVisible()
        await expect(page.getByText(/A suggested summary sends your written answers/)).toBeVisible()
        await action.click()
        await expect
            .poll(
                async () =>
                    !!(await db.mediaTranscript.findUnique({ where: { mediaId } }))?.requestedAt,
            )
            .toBe(true)
        const summary = page.locator('#story-summary')
        const published = 'First published summary ' + id
        const revised = 'Private revision ' + id
        await summary.fill(published)
        await page.getByRole('checkbox', { name: /I have permission to share this story/ }).check()
        await page.getByRole('button', { name: 'Publish my story', exact: true }).click()
        const publicPage = await visitor.newPage()
        await expect.poll(async () => {
            await publicPage.goto('/artisans/' + artisan.slug)
            return publicPage.getByText(published, { exact: true }).count()
        }).toBe(1)
        await summary.fill(revised)
        await summary.blur()
        await expect.poll(async () => (await db.craftStory.findUnique({
            where: { artisanId: artisan.id },
        }))?.summaryText).toBe(revised)
        await page.reload()
        await expect(page.locator('#story-summary')).toHaveValue(revised)
        await publicPage.reload()
        await expect(publicPage.getByText(published, { exact: true })).toBeVisible()
        await expect(publicPage.getByText(revised, { exact: true })).toHaveCount(0)
        await page.getByRole('button', { name: 'Publish changes', exact: true }).click()
        await expect.poll(async () => {
            await publicPage.reload()
            return publicPage.getByText(revised, { exact: true }).count()
        }).toBe(1)
        await db.artisan.update({ where: { id: artisan.id }, data: { deletedAt: new Date() } })
        expect((await visitor.request.get('/api/vc/' + craftId)).status()).toBe(404)
    } finally {
        if (craftId)
            await db.verifiableCredential.deleteMany({
                where: { credentialId: baseURL + '/credentials/crafts/' + craftId },
            })
        if (userId) await db.user.deleteMany({ where: { id: userId } })
        if (mediaId) await db.mediaFile.deleteMany({ where: { id: mediaId } })
        await visitor.close()
        await db.$disconnect()
    }
})
