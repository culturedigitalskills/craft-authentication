import { randomUUID } from 'node:crypto'
import { afterAll, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import storage from '@/lib/object-store'
import { storeNewMedia } from '@/lib/store-new-media'
import { eraseAccount } from '@/lib/account-erasure'
import { drainErasureObjects } from '@/lib/erasure-storage'

const stamp = randomUUID()
const users: string[] = [],
    groups: string[] = [],
    files: string[] = [],
    receipts: string[] = []
async function makeUser(label: string) {
    const user = await prisma.user.create({ data: { email: label + stamp + '@example.invalid' } })
    users.push(user.id)
    const session = await prisma.session.create({
        data: {
            id: randomUUID(),
            token: randomUUID(),
            userId: user.id,
            expiresAt: new Date(Date.now() + 3_600_000),
        },
    })
    return { user, session }
}
async function file(uploaderId: string | null) {
    const key = randomUUID()
    const row = await prisma.mediaFile.create({
        data: {
            filename: key,
            originalName: 'fixture',
            objectKey: key,
            bucket: 'erasure-test',
            uploaderId,
            mimeType: 'audio/wav',
            size: 1,
        },
    })
    files.push(row.id)
    return row
}
afterAll(async () => {
    vi.restoreAllMocks()
    await prisma.verification.deleteMany({ where: { identifier: { contains: stamp } } })
    await prisma.erasureObject.deleteMany({ where: { receiptId: { in: receipts } } })
    await prisma.erasureReceipt.deleteMany({ where: { id: { in: receipts } } })
    await prisma.group.deleteMany({ where: { id: { in: groups } } })
    await prisma.mediaFile.deleteMany({ where: { id: { in: files } } })
    await prisma.user.deleteMany({ where: { id: { in: users } } })
})

it('collects linked historical files, keeps independently used files and retries storage cleanup', async () => {
    const { user, session } = await makeUser('owner')
    const other = await makeUser('other')
    const artisan = await prisma.artisan.create({
        data: { userId: user.id, firstName: 'Test', lastName: 'Owner', slug: randomUUID() },
    })
    const group = await prisma.group.create({ data: { name: 'Test group', slug: randomUUID() } })
    groups.push(group.id)
    const owned = await file(user.id),
        extracted = await file(null),
        shared = await file(null),
        independent = await file(other.user.id)
    await prisma.mediaTranscript.create({ data: { mediaId: owned.id, audioMediaId: extracted.id } })
    await prisma.mediaAttachment.createMany({
        data: [
            { mediaId: shared.id, entityType: 'Artisan', entityId: artisan.id },
            { mediaId: shared.id, entityType: 'Group', entityId: group.id },
            { mediaId: independent.id, entityType: 'Artisan', entityId: artisan.id },
        ],
    })
    const token = (v: string, value: string) => ({
        id: randomUUID(),
        identifier: v + stamp,
        value,
        expiresAt: new Date(Date.now() + 60000),
    })
    const ownToken = token('reset-password:', user.id),
        linked = token('state:', JSON.stringify({ link: { userId: user.id } }))
    const otherToken = token(
        'other:',
        JSON.stringify({ link: { userId: other.user.id }, extra: user.id }),
    )
    await prisma.verification.createMany({ data: [ownToken, linked, otherToken] })
    const result = await eraseAccount(user.id, session.id)
    if (!('receiptId' in result)) throw new Error('Expected deletion')
    receipts.push(result.receiptId)
    expect(result.pending).toBe(true)
    expect(await eraseAccount(user.id, session.id)).toEqual({ error: 'SESSION_EXPIRED' })
    expect(
        await prisma.mediaFile.findMany({
            where: { id: { in: [shared.id, independent.id] } },
            select: { id: true },
        }),
    ).toHaveLength(2)
    expect(await prisma.mediaFile.count({ where: { id: { in: [owned.id, extracted.id] } } })).toBe(
        0,
    )
    expect(
        await prisma.verification.count({ where: { id: { in: [ownToken.id, linked.id] } } }),
    ).toBe(0)
    expect(await prisma.verification.count({ where: { id: otherToken.id } })).toBe(1)
    const send = vi.spyOn(storage, 'send').mockRejectedValue(new Error('isolated simulated outage'))
    try {
        await drainErasureObjects(result.receiptId)
        expect(await prisma.erasureObject.count({ where: { receiptId: result.receiptId } })).toBe(2)
        expect(
            (await prisma.erasureReceipt.findUniqueOrThrow({ where: { id: result.receiptId } }))
                .completedAt,
        ).toBeNull()
        await prisma.erasureObject.updateMany({
            where: { receiptId: result.receiptId },
            data: { retryAt: new Date(0) },
        })
        send.mockResolvedValue(undefined)
        await Promise.all([
            drainErasureObjects(result.receiptId),
            drainErasureObjects(result.receiptId),
        ])
        expect(await prisma.erasureObject.count({ where: { receiptId: result.receiptId } })).toBe(0)
        expect(
            (await prisma.erasureReceipt.findUniqueOrThrow({ where: { id: result.receiptId } }))
                .completedAt,
        ).toBeInstanceOf(Date)
    } finally {
        send.mockRestore()
    }
})

it('keeps a deletion pending until a concurrent upload has been cleaned up', async () => {
    const { user, session } = await makeUser('inflight')
    const key = randomUUID()
    let started!: () => void
    let release!: () => void
    const uploading = new Promise<void>((resolve) => {
        started = resolve
    })
    const hold = new Promise<void>((resolve) => {
        release = resolve
    })
    const send = vi
        .spyOn(storage, 'send')
        .mockImplementationOnce(async () => {
            started()
            await hold
        })
        .mockResolvedValue(undefined)
    try {
        const upload = storeNewMedia(
            {
                id: key,
                bucket: 'erasure-test',
                objectKey: key,
                filename: key,
                originalName: 'file',
                size: 1,
                mimeType: 'image/png',
                uploaderId: user.id,
            },
            Buffer.alloc(1),
        )
        await uploading
        const result = await eraseAccount(user.id, session.id)
        if (!('receiptId' in result)) throw new Error('Expected receipt')
        receipts.push(result.receiptId)
        expect(result.pending).toBe(true)
        expect(await prisma.erasureObject.count({ where: { receiptId: result.receiptId } })).toBe(1)
        release()
        await expect(upload).rejects.toThrow('account was removed')
        await drainErasureObjects(result.receiptId)
        expect(await prisma.mediaFile.count({ where: { id: key } })).toBe(0)
        expect(
            (await prisma.erasureReceipt.findUniqueOrThrow({ where: { id: result.receiptId } }))
                .completedAt,
        ).toBeInstanceOf(Date)
    } finally {
        release()
        send.mockRestore()
    }
})
