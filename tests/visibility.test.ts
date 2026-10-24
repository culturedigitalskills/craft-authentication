import { describe, it, expect } from 'vitest'
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
