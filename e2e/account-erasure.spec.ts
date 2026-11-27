import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { baseURL, isolatedEnvironment } from './isolated-environment.mjs'

test('a maker can hide and then permanently erase their account, hosted certificates and real stored media', async ({
    page,
    browser,
}) => {
    test.setTimeout(160_000)
    const env = isolatedEnvironment()
    const db = new PrismaClient({
        adapter: new PrismaPg({ connectionString: env.DATABASE_URL_APP }),
    })
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.S3_ENDPOINT).hostname))
        throw new Error('Requires isolated local storage')
    const storage = new S3Client({
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION || 'garage',
        forcePathStyle: true,
        credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    })
    const id = randomUUID()
    const email = id + '@example.invalid'
    const password = 'Local-only-' + id
    const headers = { Origin: baseURL }
    const second = await browser.newContext({ baseURL })
    const visitor = await browser.newContext({ baseURL })
    const fixture = await db.user.create({
        data: { email: 'other-' + email, role: 'ADMIN', name: 'Other account' },
    })
    let owner = '',
        craftId = '',
        groupId = '',
        mediaId = '',
        receiptId = ''
    try {
        const signup = await page.request.post('/api/auth/sign-up/email', {
            headers,
            data: { name: 'Erase Test', email, password },
        })
        expect(signup.ok()).toBe(true)
        owner = (await signup.json()).user.id
        expect(
            (
                await second.request.post('/api/auth/sign-in/email', {
                    headers,
                    data: { email, password },
                })
            ).ok(),
        ).toBe(true)
        const artisan = await db.artisan.create({
            data: { userId: owner, firstName: 'Erase', lastName: 'Test', slug: id },
        })
        const group = await db.group.create({
            data: {
                name: 'Independent group',
                slug: id,
                memberships: { create: { artisanId: artisan.id } },
            },
        })
        groupId = group.id
        const upload = await page.request.post('/api/media/upload', {
            headers,
            multipart: {
                file: {
                    name: 'test-image.png',
                    mimeType: 'image/png',
                    buffer: await readFile('public/test/test_cr_no_manifest.png'),
                },
            },
        })
        expect(upload.status()).toBe(201)
        const media = await upload.json()
        mediaId = media.id
        const variant =
            '/_next/image?url=' + encodeURIComponent('/api/media/' + mediaId) + '&w=640&q=75'
        const variantRedirect = await visitor.request.get(variant, { maxRedirects: 0 })
        expect(variantRedirect.status()).toBe(307)
        expect(variantRedirect.headers().location).toMatch(
            new RegExp('/api/media/' + mediaId + '$'),
        )

        const object = { Bucket: media.bucket, Key: media.objectKey }
        expect((await storage.send(new HeadObjectCommand(object))).ContentLength).toBeGreaterThan(0)
        const craft = await page.request.post('/api/crafts', {
            headers,
            data: { title: 'Fixture craft', isPublic: true, mediaIds: [media.id] },
        })
        expect(craft.status()).toBe(201)
        craftId = (await craft.json()).id
        expect((await visitor.request.get('/api/vc/' + craftId)).status()).toBe(200)
        await db.mediaAttachment.create({
            data: { mediaId, entityType: 'Group', entityId: groupId, attachmentType: 'COVER' },
        })
        const story = await db.craftStory.create({
            data: {
                artisanId: artisan.id,
                answerSelfText: 'Draft',
                status: 'PUBLISHED',
                publication: {
                    create: {
                        answers: { answerSelfText: 'First public edition' },
                        mediaIds: [mediaId],
                    },
                },
                film: { create: { status: 'READY', outputMediaId: mediaId } },
            },
        })
        await db.userSecrets.create({
            data: { userId: owner, type: 'TEST', ciphertextData: 'synthetic' },
        })
        await db.taskEvent.create({
            data: { userId: owner, settings: { prompt: 'fixture' }, mediaFileId: mediaId },
        })
        await db.dataRecord.create({
            data: {
                id: craftId,
                name: 'Legacy craft',
                data: { artisan: email, mediaIds: [mediaId] },
            },
        })
        await db.adminAuditLog.create({
            data: {
                actorUserId: fixture.id,
                actorEmail: fixture.email,
                entityType: 'Artisan',
                entityId: artisan.id,
                action: 'artisan.restore',
                detail: { name: 'Erase Test' },
            },
        })
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto('/')
        await page.getByRole('button', { name: 'Open menu', exact: true }).click()
        await page
            .getByRole('link', { name: 'Account settings', exact: true })
            .filter({ visible: true })
            .click()
        await expect(page.getByText('Crafts: 1 · Stories: 1 · Uploaded files: 1')).toBeVisible()
        await page.getByRole('button', { name: 'Hide my maker profile', exact: true }).click()
        await expect(page.getByText(/Your profile is hidden/)).toBeVisible()
        expect(await db.mediaFile.count({ where: { id: mediaId } })).toBe(1)
        await page.evaluate((user) => {
            localStorage.setItem('sc:profile-draft:' + user, 'test')
            sessionStorage.setItem('sc:story-editor:' + user, 'test')
        }, owner)
        await page.getByRole('button', { name: 'Review permanent deletion' }).click()
        await page.getByRole('button', { name: 'Cancel', exact: true }).click()
        expect(await db.user.count({ where: { id: owner } })).toBe(1)
        await page.getByRole('button', { name: 'Review permanent deletion' }).click()
        await page.getByLabel('Current password').fill('wrong-password')
        await page.getByRole('button', { name: 'Permanently delete my account' }).click()
        await expect(
            page.getByRole('alert').filter({ hasText: 'Check your current password' }),
        ).toBeVisible()
        await page.getByLabel('Current password').fill(password)
        await page.getByRole('button', { name: 'Permanently delete my account' }).click()
        await expect(page).toHaveURL(/\/account\/deleted$/)
        await expect(page.getByText(/removed from the active service/)).toBeVisible({
            timeout: 75_000,
        })
        receiptId =
            (await page.context().cookies()).find((c) => c.name === 'craft-erasure-receipt')
                ?.value ?? ''
        expect(
            await page.evaluate(
                (user) => [
                    localStorage.getItem('sc:profile-draft:' + user),
                    sessionStorage.getItem('sc:story-editor:' + user),
                ],
                owner,
            ),
        ).toEqual([null, null])
        expect(await db.user.count({ where: { id: owner } })).toBe(0)
        expect(await db.session.count({ where: { userId: owner } })).toBe(0)
        expect(await db.account.count({ where: { userId: owner } })).toBe(0)
        expect(await db.userSecrets.count({ where: { userId: owner } })).toBe(0)
        expect(await db.taskEvent.count({ where: { userId: owner } })).toBe(0)
        expect(await db.mediaFile.count({ where: { id: mediaId } })).toBe(0)
        expect(await db.storyPublication.count({ where: { storyId: story.id } })).toBe(0)
        expect(await db.storyFilm.count({ where: { storyId: story.id } })).toBe(0)
        expect(await db.dataRecord.count({ where: { id: craftId } })).toBe(0)
        expect(await db.group.count({ where: { id: groupId } })).toBe(1)
        expect(await db.adminAuditLog.count({ where: { entityId: artisan.id } })).toBe(0)
        expect(await db.user.count({ where: { id: fixture.id } })).toBe(1)
        expect((await visitor.request.get('/api/vc/' + craftId)).status()).toBe(404)
        expect((await visitor.request.get('/api/media/' + mediaId)).status()).toBe(404)
        expect((await visitor.request.get(variant)).status()).toBe(404)
        expect((await visitor.request.get('/artisans/' + artisan.slug)).status()).toBe(404)
        expect((await second.request.get('/api/artisans/me/story')).status()).toBe(401)
        await expect(storage.send(new HeadObjectCommand(object))).rejects.toMatchObject({
            $metadata: { httpStatusCode: 404 },
        })
        expect(
            (await (await visitor.request.get('/api/account/erasure-status')).json()).status,
        ).toBe('unavailable')
    } finally {
        await db.adminAuditLog.deleteMany({ where: { actorUserId: fixture.id } })
        if (craftId) {
            await db.verifiableCredential.deleteMany({
                where: { credentialId: baseURL + '/credentials/crafts/' + craftId },
            })
            await db.dataRecord.deleteMany({ where: { id: craftId } })
        }
        if (owner) await db.user.deleteMany({ where: { id: owner } })
        if (groupId) await db.group.deleteMany({ where: { id: groupId } })
        if (mediaId) await db.mediaFile.deleteMany({ where: { id: mediaId } })
        if (receiptId)
            await db.erasureReceipt.deleteMany({ where: { id: receiptId, objects: { none: {} } } })
        await db.user.deleteMany({ where: { id: fixture.id } })
        await visitor.close()
        await second.close()
        await db.$disconnect()
        storage.destroy()
    }
})

test('profile-less Google accounts require a recent session and an explicit same-account confirmation', async ({
    page,
}) => {
    const env = isolatedEnvironment()
    const db = new PrismaClient({
        adapter: new PrismaPg({ connectionString: env.DATABASE_URL_APP }),
    })
    const id = randomUUID(),
        email = id + '@example.invalid',
        headers = { Origin: baseURL }
    const admin = await db.user.create({ data: { email: 'admin-' + email, role: 'ADMIN' } })
    let userId = '',
        receiptId = ''
    try {
        const signup = await page.request.post('/api/auth/sign-up/email', {
            headers,
            data: { name: 'Local OAuth fixture', email, password: 'Temporary-' + id },
        })
        expect(signup.ok()).toBe(true)
        userId = (await signup.json()).user.id
        // Use a locally authenticated test session to exercise post-OAuth freshness.
        // Google itself is disabled in the isolated browser environment.
        await db.account.updateMany({
            where: { userId },
            data: { providerId: 'google', accountId: id, password: null },
        })
        await db.session.updateMany({
            where: { userId },
            data: { createdAt: new Date(Date.now() - 3_600_000) },
        })
        const data = { accountId: userId, confirmation: true }
        expect(
            (
                await page.request.delete('/api/account', {
                    headers: { Origin: 'https://example.invalid' },
                    data,
                })
            ).status(),
        ).toBe(403)
        expect(
            (
                await page.request.delete('/api/account', {
                    headers,
                    data: { ...data, accountId: admin.id },
                })
            ).status(),
        ).toBe(400)
        expect(
            (
                await page.request.delete('/api/account', {
                    headers,
                    data: { ...data, confirmation: false },
                })
            ).status(),
        ).toBe(400)
        expect(
            (await (await page.request.delete('/api/account', { headers, data })).json()).error,
        ).toBe('REAUTH')
        await page.goto('/account')
        await page.getByRole('button', { name: 'Review permanent deletion' }).click()
        await expect(page.getByRole('button', { name: 'Sign in again with Google' })).toBeVisible()
        await expect(
            page.getByRole('button', { name: 'Permanently delete my account' }),
        ).toBeDisabled()
        await db.session.updateMany({ where: { userId }, data: { createdAt: new Date() } })
        const result = await page.request.delete('/api/account', { headers, data })
        expect(result.status()).toBe(200)
        expect(await db.user.count({ where: { id: userId } })).toBe(0)
        receiptId =
            (await page.context().cookies()).find((c) => c.name === 'craft-erasure-receipt')
                ?.value ?? ''
    } finally {
        await db.user.deleteMany({ where: { id: { in: [admin.id, userId] } } })
        if (receiptId)
            await db.erasureReceipt.deleteMany({ where: { id: receiptId, objects: { none: {} } } })
        await db.$disconnect()
    }
})
