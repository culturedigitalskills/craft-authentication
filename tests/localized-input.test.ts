import { describe, expect, it } from 'vitest'
import { isValidHashtag, normalizeHashtag } from '@/lib/validations/hashtag'
import { CreateArtisanSchema } from '@/lib/validations/artisan'
import { displayCountry, formatLocation } from '@/data/locations'

describe('multilingual input and display labels', () => {
    it.each([
        'حرف_يدوية',
        'हस्तशिल्प',
        'χειροτεχνία',
        'el_işi',
        'artesanía',
        'Holz_123',
        '手仕事_作品',
    ])('accepts supported-script hashtag %s', (tag) => {
        expect(isValidHashtag(tag)).toBe(true)
        const parsed = CreateArtisanSchema.parse({
            firstName: 'Local',
            lastName: 'Test',
            hashtags: [tag],
        })
        expect(parsed.hashtags).toEqual([tag.normalize('NFC')])
    })
    it('normalizes equivalent new input and rejects whitespace, punctuation and invisible controls', () => {
        expect(normalizeHashtag('#café')).toBe('café')
        for (const value of ['two words', '<script>', 'tag\u202e', 'x'.repeat(51), '']) {
            expect(isValidHashtag(value)).toBe(false)
        }
    })
    it('localizes recognized country labels while preserving free-text locations', () => {
        expect(displayCountry('Turkey', 'tr')).toBe('Türkiye')
        expect(displayCountry('TR', 'ar')).toBe('تركيا')
        expect(displayCountry('Custom country text', 'ar')).toBe('Custom country text')
        expect(formatLocation('Turkey', 'Istanbul', 'tr')).toBe('Istanbul, Türkiye')
    })
})
