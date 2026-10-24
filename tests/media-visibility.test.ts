import { describe, it, expect } from 'vitest'
import { attachmentIsPublic } from '@/lib/media-visibility'

// The decision table that governs whether a file is served to anybody. Getting
// one of these wrong does not throw: it serves a private photo, or breaks a
// public page. Every branch is pinned.

describe('attachmentIsPublic', () => {
    describe('artisan media (profile photo, cover, gallery)', () => {
        it('is public when the attachment is public and the artisan is present', () => {
            expect(attachmentIsPublic('Artisan', true, { kind: 'artisan', removed: false })).toBe(true)
        })

        it('is private when the artisan marked it private', () => {
            expect(attachmentIsPublic('Artisan', false, { kind: 'artisan', removed: false })).toBe(false)
        })

        it('is private once the artisan has been removed', () => {
            expect(attachmentIsPublic('Artisan', true, { kind: 'artisan', removed: true })).toBe(false)
        })
    })

    describe('craft media', () => {
        const live = { kind: 'craft', isPublic: true, removed: false, artisanRemoved: false } as const

        it('is public for a published craft by a present artisan', () => {
            expect(attachmentIsPublic('Craft', true, live)).toBe(true)
        })

        it('is private while the craft is unpublished', () => {
            expect(attachmentIsPublic('Craft', true, { ...live, isPublic: false })).toBe(false)
        })

        it('is private once the craft is removed', () => {
            expect(attachmentIsPublic('Craft', true, { ...live, removed: true })).toBe(false)
        })

        it('is private once the maker is removed, even though the craft is public', () => {
            expect(attachmentIsPublic('Craft', true, { ...live, artisanRemoved: true })).toBe(false)
        })
    })

    describe('story media (recordings, workshop photos)', () => {
        it('is public once the story is published', () => {
            expect(
                attachmentIsPublic('CraftStory', true, {
                    kind: 'story',
                    published: true,
                    artisanRemoved: false,
                }),
            ).toBe(true)
        })

        it('is private while the story is still a draft', () => {
            expect(
                attachmentIsPublic('CraftStory', true, {
                    kind: 'story',
                    published: false,
                    artisanRemoved: false,
                }),
            ).toBe(false)
        })

        it('is private once the artisan is removed', () => {
            expect(
                attachmentIsPublic('CraftStory', true, {
                    kind: 'story',
                    published: true,
                    artisanRemoved: true,
                }),
            ).toBe(false)
        })
    })

    describe('fallbacks', () => {
        it('treats a missing entity as private', () => {
            expect(attachmentIsPublic('Craft', true, { kind: 'missing' })).toBe(false)
        })

        it('treats an unknown entity type as private', () => {
            expect(attachmentIsPublic('Something', true, { kind: 'missing' })).toBe(false)
        })

        it('follows the group active flag', () => {
            expect(attachmentIsPublic('Group', true, { kind: 'group', isActive: true })).toBe(true)
            expect(attachmentIsPublic('Group', true, { kind: 'group', isActive: false })).toBe(false)
        })
    })
})
