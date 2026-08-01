import { prisma } from '@/lib/prisma'
import { renderStoryFilm } from './render'

// A PENDING/PROCESSING film untouched this long is presumed orphaned by a crash
// or redeploy and may be reclaimed. Renders are heavier than transcriptions, so
// the window is wider.
const STALE_FILM_MS = 30 * 60 * 1000

// Films render one at a time on their OWN lane — a render holds several ffmpeg
// passes and a full story's media on disk, and must not block (or be blocked by)
// the caption pipeline.
let filmChain: Promise<void> = Promise.resolve()

function scheduleFilm(storyId: string) {
    filmChain = filmChain
        .then(() => renderStoryFilm(storyId))
        .catch(err => {
            console.error(`Unhandled film render error for story ${storyId}:`, err)
        })
}

/**
 * Atomically claim a film for rendering. Claimable states are PENDING, FAILED
 * (retry), and stale PROCESSING. `force` (explicit regenerate) also claims a
 * READY film so it can be rebuilt in place. Exactly one caller wins.
 */
async function claimFilm(storyId: string, opts: { force?: boolean } = {}): Promise<boolean> {
    const staleCutoff = new Date(Date.now() - STALE_FILM_MS)
    const claimed = await prisma.storyFilm.updateMany({
        where: {
            storyId,
            OR: [
                { status: { in: opts.force ? ['PENDING', 'FAILED', 'READY'] : ['PENDING', 'FAILED'] } },
                { status: 'PROCESSING', updatedAt: { lt: staleCutoff } },
            ],
        },
        data: { status: 'PROCESSING', error: null },
    })
    return claimed.count === 1
}

/**
 * Ensure a film render is queued for this story. Idempotent: creates the row if
 * absent, then claims and schedules. `force` regenerates an already-READY film.
 */
export async function enqueueFilm(storyId: string, opts: { force?: boolean } = {}): Promise<void> {
    await prisma.storyFilm.upsert({
        where: { storyId },
        create: { storyId, status: 'PENDING' },
        update: {},
    })
    if (await claimFilm(storyId, opts)) scheduleFilm(storyId)
}

/**
 * Re-queue renders orphaned by a crash or redeploy (PENDING/PROCESSING past the
 * staleness window). Called from instrumentation on boot and on a heartbeat.
 * FAILED films are not swept — they retry when the artisan regenerates.
 */
export async function recoverStaleFilms(): Promise<void> {
    const staleCutoff = new Date(Date.now() - STALE_FILM_MS)
    const stale = await prisma.storyFilm.findMany({
        where: {
            status: { in: ['PENDING', 'PROCESSING'] },
            updatedAt: { lt: staleCutoff },
        },
        select: { storyId: true },
    })
    for (const { storyId } of stale) {
        if (await claimFilm(storyId)) scheduleFilm(storyId)
    }
}
