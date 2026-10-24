import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { PUBLIC_CRAFT_WHERE } from '@/lib/craft'
import { ACTIVE_MEMBERSHIP_WHERE } from '@/lib/group'

// Removing an artisan is a soft delete, so what actually takes their work out
// of public view is these two filters being spread into every public query.
// Losing a clause here fails open: the row stays visible and nothing errors.

describe('PUBLIC_CRAFT_WHERE', () => {
    it('requires the craft to be published and not removed', () => {
        expect(PUBLIC_CRAFT_WHERE.isPublic).toBe(true)
        expect(PUBLIC_CRAFT_WHERE.deletedAt).toBeNull()
    })

    it('excludes crafts whose maker has been removed', () => {
        expect(PUBLIC_CRAFT_WHERE.artisan).toEqual({ deletedAt: null })
    })
})

describe('ACTIVE_MEMBERSHIP_WHERE', () => {
    it('excludes members who have left the group', () => {
        expect(ACTIVE_MEMBERSHIP_WHERE.leftDate).toBeNull()
    })

    it('excludes members whose artisan profile has been removed', () => {
        expect(ACTIVE_MEMBERSHIP_WHERE.artisan).toEqual({ deletedAt: null })
    })
})

/**
 * Asserting the constants cannot catch the way this actually breaks, which is a
 * query that never spreads them. Two membership queries were missed on the
 * first pass and both leaked a removed artisan, one of them from an endpoint
 * that needs no login, so the bare filter is checked for directly.
 *
 * A file earns its place on the allowlist by querying memberships that are not
 * a public listing: the caller's own, or one specific row being administered.
 * If a new file appears here, use ACTIVE_MEMBERSHIP_WHERE instead, and only add
 * it below once you are sure what it returns is never shown to the public.
 */
const BARE_LEFT_DATE_ALLOWED = new Set([
    // Re-joining a group: writes leftDate back to null rather than filtering.
    'api/groups/[id]/members/route.ts',
    // Resolves one membership by id so it can be administered.
    'api/groups/[id]/members/[memberId]/route.ts',
    // The memberships of the single artisan whose page this is; an admin
    // viewing a removed profile has to keep seeing them.
    '[locale]/artisans/[slug]/page.tsx',
    // The signed-in artisan's own memberships.
    '[locale]/groups/mygroups/page.tsx',
    '[locale]/profile/page.tsx',
])

function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full, acc)
        else if (/\.tsx?$/.test(entry.name)) acc.push(full)
    }
    return acc
}

/**
 * Hiding a removed artisan is only half of it: without this they stayed signed
 * in and kept writing. Every handler that creates or changes content now goes
 * through requireActiveArtisan, and a new one reaching for the plain guard is
 * the way that quietly comes back.
 *
 * The exemptions are routes where a removed artisan still legitimately acts:
 * their own keys and vault, the removal itself, and the two verification
 * endpoints that take no session at all because anyone may check a credential.
 */
const PLAIN_AUTH_ALLOWED = new Set([
    // Removing and restoring a profile has to work on a removed profile.
    'artisans/[id]/route.ts',
    // Personal key material and vault, not public content.
    'c2pa/auto-renew/route.ts',
    'c2pa/setup/route.ts',
    'c2pa/sign/route.ts',
    'vault/initialize/route.ts',
    'vault/rotate-key/route.ts',
    'vault/secrets/route.ts',
    // Public credential verification; deliberately unauthenticated.
    'c2pa/verify/route.ts',
    'vc/verify/route.ts',
])

describe('write handlers', () => {
    it('refuse a removed artisan unless explicitly exempt', () => {
        const apiDir = path.resolve(__dirname, '../src/app/api')
        const offenders: string[] = []

        for (const file of walk(apiDir)) {
            const rel = path.relative(apiDir, file).split(path.sep).join('/')
            if (PLAIN_AUTH_ALLOWED.has(rel)) continue

            const source = fs.readFileSync(file, 'utf8')
            const lines = source.split(/\r?\n/)
            lines.forEach((line, i) => {
                if (!/export async function (POST|PUT|PATCH|DELETE)\b/.test(line)) return
                const body = lines.slice(i, i + 10).join('\n')
                // Anything stricter than requireAuth is fine; a bare one is not.
                if (/requireAuth\(\)/.test(body)) offenders.push(rel)
            })
        }

        expect([...new Set(offenders)]).toEqual([])
    })
})

describe('membership queries', () => {
    it('uses the shared filter everywhere that is not explicitly exempt', () => {
        const appDir = path.resolve(__dirname, '../src/app')
        const offenders = walk(appDir)
            .filter(file => /leftDate:\s*null/.test(fs.readFileSync(file, 'utf8')))
            .map(file => path.relative(appDir, file).split(path.sep).join('/'))
            .filter(rel => !BARE_LEFT_DATE_ALLOWED.has(rel))

        expect(offenders).toEqual([])
    })
})
