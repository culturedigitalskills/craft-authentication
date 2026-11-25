import { randomUUID } from 'node:crypto'
import { beforeAll, beforeEach, afterAll, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { POST as publish } from '@/app/api/artisans/me/story/publish/route'
import { PATCH as feature } from '@/app/api/artisans/me/story/film/route'
import { PUT as save } from '@/app/api/artisans/me/story/route'
import { resolveMediaAccess } from '@/lib/media-visibility'
import { enqueueFilm } from '@/lib/film/jobs'
import { validCues } from '@/lib/vtt'

const userId = randomUUID(),
    artisanId = randomUUID(),
    voice = randomUUID(),
    photo = randomUUID(),
    output = randomUUID()
vi.mock('@/lib/auth-guard', () => ({
    requireActiveArtisan: async () => ({
        session: { user: { id: userId, role: 'ARTISAN' } },
        unauthorized: null,
    }),
}))
vi.mock('@/lib/film/jobs', () => ({ enqueueFilm: vi.fn() }))
const request = (body: object) =>
    new NextRequest('http://localhost/api/artisans/me/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
beforeAll(async () => {
    if (new URL(process.env.DATABASE_URL_APP!).pathname !== '/crafts_test')
        throw Error('Isolated crafts_test database required')
    await prisma.user.create({ data: { id: userId, email: userId + '@example.test' } })
    await prisma.artisan.create({
        data: { id: artisanId, userId, firstName: 'Fixture', lastName: 'Maker', slug: artisanId },
    })
    for (const [id, mimeType] of [
        [voice, 'audio/wav'],
        [photo, 'image/png'],
        [output, 'video/mp4'],
    ]) {
        await prisma.mediaFile.create({
            data: {
                id,
                mimeType,
                filename: id,
                originalName: id,
                size: 1,
                uploaderId: userId,
                objectKey: id,
                bucket: 'test-story-editions',
            },
        })
    }
})
beforeEach(async () => {
    await prisma.mediaAttachment.deleteMany({ where: { mediaId: { in: [voice, photo, output] } } })
    await prisma.craftStory.deleteMany({ where: { artisanId } })
})
afterAll(async () => {
    await prisma.mediaAttachment.deleteMany({ where: { mediaId: { in: [voice, photo, output] } } })
    await prisma.artisan.deleteMany({ where: { id: artisanId } })
    await prisma.mediaFile.deleteMany({ where: { id: { in: [voice, photo, output] } } })
    await prisma.user.deleteMany({ where: { id: userId } })
})
it('keeps draft edits and new workshop files private; voice-only publishing never waits for a film', async () => {
    const story = await prisma.craftStory.create({
        data: { artisanId, answerSelfText: 'First edition', answerSelfMediaId: voice },
    })
    expect((await publish(request({}))).status).toBe(400)
    expect((await resolveMediaAccess(voice, userId)).isPublic).toBe(false)
    expect((await publish(request({ consent: true }))).status).toBe(200)
    expect(enqueueFilm).not.toHaveBeenCalled()
    expect((await resolveMediaAccess(voice, userId)).isPublic).toBe(true)
    expect(
        (
            await save(
                request({ expectNew: true, answerSelfText: 'Stale form from back navigation' }),
            )
        ).status,
    ).toBe(409)
    const previous = await prisma.craftStory.findUniqueOrThrow({ where: { id: story.id } })
    expect(
        (
            await save(
                request({
                    answerSelfText: 'New edition',
                    expectedUpdatedAt: previous.updatedAt.toISOString(),
                }),
            )
        ).status,
    ).toBe(200)
    expect(
        (
            await save(
                request({
                    answerSelfText: 'Stale tab',
                    expectedUpdatedAt: previous.updatedAt.toISOString(),
                }),
            )
        ).status,
    ).toBe(409)
    const edition = () =>
        prisma.storyPublication.findUniqueOrThrow({ where: { storyId: story.id } })
    expect((await edition()).answers).toMatchObject({ answerSelfText: 'First edition' })
    await prisma.mediaAttachment.create({
        data: {
            mediaId: photo,
            entityId: story.id,
            entityType: 'CraftStory',
            attachmentType: 'PROCESS',
        },
    })
    expect((await resolveMediaAccess(photo, userId)).isPublic).toBe(false)
    expect((await publish(request({}))).status).toBe(200)
    expect(enqueueFilm).toHaveBeenCalledWith(story.id)
    expect((await edition()).answers).toMatchObject({ answerSelfText: 'New edition' })
    await prisma.mediaAttachment.deleteMany({ where: { entityId: story.id } })
    expect((await resolveMediaAccess(photo, userId)).isPublic).toBe(true)
    await prisma.storyFilm.create({
        data: { storyId: story.id, status: 'READY', outputMediaId: output },
    })
    expect((await publish(request({}))).status).toBe(200)
    expect((await resolveMediaAccess(output, userId)).isPublic).toBe(false)
    expect((await feature(request({ isPublic: true, outputMediaId: photo }))).status).toBe(409)
    expect((await feature(request({ isPublic: true, outputMediaId: output }))).status).toBe(200)
    await prisma.storyFilm.update({ where: { storyId: story.id }, data: { status: 'PROCESSING' } })
    expect((await resolveMediaAccess(output, userId)).isPublic).toBe(true)
    expect((await feature(request({ isPublic: false }))).status).toBe(200)
    expect((await publish(request({}))).status).toBe(200)
    expect((await resolveMediaAccess(output, userId)).isPublic).toBe(false)
})
it('a film-only story features exactly the reviewed output on first publication', async () => {
    const story = await prisma.craftStory.create({ data: { artisanId } })
    await prisma.storyFilm.create({
        data: {
            storyId: story.id,
            source: 'UPLOADED',
            status: 'READY',
            outputMediaId: output,
            isPublic: false,
        },
    })
    expect((await publish(request({ consent: true }))).status).toBe(400)
    expect((await publish(request({ consent: true, featureFilmId: photo }))).status).toBe(409)
    expect((await publish(request({ consent: true, featureFilmId: output }))).status).toBe(200)
    expect((await resolveMediaAccess(output, userId)).isPublic).toBe(true)
})
it('only advertises captions with actual text and usable timestamps', () => {
    expect(
        validCues([{}, { text: ' ', start: 0, end: 1 }, { text: 'bad', start: 2, end: 1 }]),
    ).toEqual([])
    expect(validCues([{ text: 'Daylight', start: 0, end: 1 }])).toHaveLength(1)
})
