import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ANSWER_MEDIA_FIELDS } from '@/lib/validations/craftStory'

type Result = { error: 'SESSION_EXPIRED' | 'LAST_ADMIN' } | { receiptId: string; pending: boolean }

// The admin role editor takes the same lock. Membership of the admin roster
// cannot change between checking the last-admin invariant and deleting a user.
export async function lockAccounts(tx: Prisma.TransactionClient) {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1129464148, 1)`
}

export function eraseAccount(userId: string, sessionId: string): Promise<Result> {
    return prisma.$transaction(
        async (tx) => {
            await lockAccounts(tx)
            await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
            const active = await tx.session.findFirst({
                where: { id: sessionId, userId, expiresAt: { gt: new Date() } },
                select: { user: { select: { email: true, role: true } } },
            })
            if (!active) return { error: 'SESSION_EXPIRED' }
            if (
                active.user.role === 'ADMIN' &&
                !(await tx.user.count({
                    where: { role: 'ADMIN', id: { not: userId } },
                }))
            )
                return { error: 'LAST_ADMIN' }

            // FK inserts into User, Artisan, Craft and CraftStory must complete
            // before we collect their dependants, or fail after their parent is gone.
            const [artisan] = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM "Artisan" WHERE "userId" = ${userId} FOR UPDATE`
            const crafts = artisan
                ? await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM "Craft" WHERE "artisanId" = ${artisan.id} FOR UPDATE`
                : []
            if (artisan)
                await tx.$queryRaw`SELECT id FROM "CraftStory" WHERE "artisanId" = ${artisan.id} FOR UPDATE`
            const story = artisan
                ? await tx.craftStory.findUnique({
                      where: { artisanId: artisan.id },
                      include: { publication: true, film: true },
                  })
                : null
            const ids = crafts.map((craft) => craft.id)
            // This is the exact email-to-artisan mapping used by the craft backfill.
            const legacy = await tx.$queryRaw<{ id: string; data: Prisma.JsonValue }[]>`
            SELECT r.id, r.data FROM "DataRecord" r WHERE r.id = ANY(${ids}::text[])
            OR (r.data->>'artisan' = ${active.user.email} AND NOT EXISTS
                (SELECT 1 FROM "Craft" c WHERE c.id = r.id AND c."artisanId" IS DISTINCT FROM ${artisan?.id ?? null}))`
            const craftIds = [...new Set([...ids, ...legacy.map((r) => r.id)])]
            const links: Prisma.MediaAttachmentWhereInput[] = [
                { entityType: 'Craft', entityId: { in: craftIds } },
            ]
            if (artisan) links.push({ entityType: 'Artisan', entityId: artisan.id })
            if (story) links.push({ entityType: 'CraftStory', entityId: story.id })
            const attachments = await tx.mediaAttachment.findMany({
                where: { OR: links },
                select: { mediaId: true },
            })
            const refs = new Set(attachments.map((a) => a.mediaId))
            if (story) {
                for (const id of [
                    ...ANSWER_MEDIA_FIELDS.map((k) => story[k]),
                    ...(story.publication?.mediaIds ?? []),
                    story.publication?.filmMediaId,
                    story.film?.outputMediaId,
                ])
                    if (id) refs.add(id)
            }
            for (const r of legacy) {
                const data = r.data as { mediaIds?: unknown } | null
                if (Array.isArray(data?.mediaIds))
                    for (const id of data.mediaIds) if (typeof id === 'string') refs.add(id)
            }
            const tasks = await tx.taskEvent.findMany({
                where: { userId, mediaFileId: { not: null } },
                select: { mediaFileId: true },
            })
            for (const task of tasks) if (task.mediaFileId) refs.add(task.mediaFileId)
            const owned = await tx.mediaFile.findMany({
                where: { uploaderId: userId },
                select: { id: true },
            })
            const ownedIds = owned.map((m) => m.id)
            const legacyAudio = await tx.mediaTranscript.findMany({
                where: { mediaId: { in: [...ownedIds, ...refs] }, audioMediaId: { not: null } },
                select: { audioMediaId: true },
            })
            await tx.mediaAttachment.deleteMany({ where: { OR: links } })
            await tx.$executeRaw`DELETE FROM "VerifiableCredential" WHERE "credentialType" = 'CraftCredential'
            AND regexp_replace("credentialId", '^.*/credentials/crafts/', '') = ANY(${craftIds}::text[])`
            await tx.dataRecord.deleteMany({ where: { id: { in: legacy.map((r) => r.id) } } })
            // Better Auth stores password-reset/deletion tokens by exact user ID,
            // and pending OAuth linking state as JSON with a link.userId member.
            const possibleLinks = await tx.verification.findMany({
                where: { value: { contains: userId } },
                select: { id: true, value: true },
            })
            const linkedIds = possibleLinks.flatMap((item) => {
                try {
                    return JSON.parse(item.value)?.link?.userId === userId ? [item.id] : []
                } catch {
                    return []
                }
            })
            await tx.verification.deleteMany({
                where: {
                    OR: [
                        { identifier: { in: [active.user.email, userId] } },
                        {
                            value: userId,
                            OR: [
                                { identifier: { startsWith: 'reset-password:' } },
                                { identifier: { startsWith: 'delete-account-' } },
                            ],
                        },
                        { id: { in: linkedIds } },
                    ],
                },
            })
            // Keep the independent moderation event and other participants' history.
            await tx.adminAuditLog.updateMany({
                where: { actorUserId: userId },
                data: { actorUserId: '[deleted]', actorEmail: '[deleted]' },
            })
            await tx.adminAuditLog.updateMany({
                where: {
                    OR: [
                        { entityType: 'User', entityId: userId },
                        ...(artisan ? [{ entityType: 'Artisan', entityId: artisan.id }] : []),
                    ],
                },
                data: { entityId: '[deleted]', detail: Prisma.DbNull },
            })
            const receipt = await tx.erasureReceipt.create({ data: {} })
            await tx.erasureObject.updateMany({
                where: { pendingUploaderId: userId },
                data: { receiptId: receipt.id, pendingUploaderId: null },
            })
            await tx.user.delete({ where: { id: userId } })
            // Owned uploads leave every placement. For unowned historic media,
            // keep files still used independently by someone else's records.
            const removeFiles = async (mediaIds: string[], legacyOnly: boolean) => {
                if (!mediaIds.length) return
                if (legacyOnly)
                    await tx.$queryRaw`SELECT id FROM "MediaFile" WHERE id = ANY(${mediaIds}::text[]) ORDER BY id FOR UPDATE`
                const safeguard = legacyOnly
                    ? Prisma.sql`AND m."uploaderId" IS NULL
                AND NOT EXISTS (SELECT 1 FROM "MediaAttachment" a WHERE a."mediaId" = m.id)
                AND NOT EXISTS (SELECT 1 FROM "StoryFilm" f WHERE f."outputMediaId" = m.id)
                AND NOT EXISTS (SELECT 1 FROM "MediaTranscript" t WHERE t."audioMediaId" = m.id)
                AND NOT EXISTS (SELECT 1 FROM "TaskEvent" e WHERE e.media_file_id = m.id)
                AND NOT EXISTS (SELECT 1 FROM "StoryPublication" p WHERE m.id = ANY(p."mediaIds") OR p."filmMediaId" = m.id)
                AND NOT EXISTS (SELECT 1 FROM "CraftStory" s WHERE m.id IN
                    (s."answerSelfMediaId", s."answerCraftMediaId", s."answerMeaningMediaId",
                     s."answerBenefitsMediaId", s."answerFutureMediaId", s."answerChallengesMediaId"))
                AND NOT EXISTS (SELECT 1 FROM "DataRecord" r WHERE (r.data->'mediaIds') ? m.id)`
                    : Prisma.empty
                const files = await tx.$queryRaw<{ bucket: string; objectKey: string }[]>`
                DELETE FROM "MediaFile" m WHERE m.id = ANY(${mediaIds}::text[]) ${safeguard}
                RETURNING bucket, "objectKey"`
                if (files.length)
                    await tx.erasureObject.createMany({
                        data: files.map((f) => ({ ...f, receiptId: receipt.id })),
                    })
            }
            await removeFiles(ownedIds, false)
            await removeFiles([...refs], true)
            await removeFiles(
                legacyAudio.flatMap((a) => (a.audioMediaId ? [a.audioMediaId] : [])),
                true,
            )
            const pending = !!(await tx.erasureObject.count({ where: { receiptId: receipt.id } }))
            if (!pending)
                await tx.erasureReceipt.update({
                    where: { id: receipt.id },
                    data: { completedAt: new Date() },
                })
            return { receiptId: receipt.id, pending }
        },
        { timeout: 30_000 },
    )
}
