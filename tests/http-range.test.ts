import { describe, it, expect } from 'vitest'
import { parseRangeHeader } from '@/lib/http-range'

describe('parseRangeHeader', () => {
    it('ignores an absent header', () => {
        expect(parseRangeHeader(null, 1000)).toEqual({ kind: 'none' })
    })

    it('ignores non-bytes units and malformed values', () => {
        expect(parseRangeHeader('items=0-', 1000)).toEqual({ kind: 'none' })
        expect(parseRangeHeader('bytes=abc-', 1000)).toEqual({ kind: 'none' })
        expect(parseRangeHeader('bytes=-', 1000)).toEqual({ kind: 'none' })
        expect(parseRangeHeader('bytes', 1000)).toEqual({ kind: 'none' })
    })

    it('ignores multi-range requests (degrade to full 200)', () => {
        expect(parseRangeHeader('bytes=0-1,5-9', 1000)).toEqual({ kind: 'none' })
    })

    it('ignores an inverted range', () => {
        expect(parseRangeHeader('bytes=9-2', 1000)).toEqual({ kind: 'none' })
    })

    it('parses an open-ended range', () => {
        expect(parseRangeHeader('bytes=0-', 1000)).toEqual({ kind: 'range', start: 0, end: 999 })
        expect(parseRangeHeader('bytes=500-', 1000)).toEqual({ kind: 'range', start: 500, end: 999 })
    })

    it('parses a bounded range and clamps end to the resource size', () => {
        expect(parseRangeHeader('bytes=100-199', 1000)).toEqual({ kind: 'range', start: 100, end: 199 })
        expect(parseRangeHeader('bytes=0-999999', 100)).toEqual({ kind: 'range', start: 0, end: 99 })
    })

    it('parses a suffix range', () => {
        expect(parseRangeHeader('bytes=-500', 1000)).toEqual({ kind: 'range', start: 500, end: 999 })
        // Suffix longer than the resource means the whole resource.
        expect(parseRangeHeader('bytes=-5000', 1000)).toEqual({ kind: 'range', start: 0, end: 999 })
    })

    it('rejects a zero-length suffix as unsatisfiable', () => {
        expect(parseRangeHeader('bytes=-0', 1000)).toEqual({ kind: 'unsatisfiable' })
    })

    it('rejects a start at or past the end of the resource', () => {
        expect(parseRangeHeader('bytes=1000-', 1000)).toEqual({ kind: 'unsatisfiable' })
        expect(parseRangeHeader('bytes=2000-2100', 1000)).toEqual({ kind: 'unsatisfiable' })
    })

    it('treats any range against an empty resource as unsatisfiable', () => {
        expect(parseRangeHeader('bytes=0-', 0)).toEqual({ kind: 'unsatisfiable' })
        expect(parseRangeHeader('bytes=-100', 0)).toEqual({ kind: 'unsatisfiable' })
    })
})
