import { describe, it, expect } from 'vitest'
import { segmentsToVtt, vttTimestamp, type TranscriptSegment } from '@/lib/vtt'

describe('vttTimestamp', () => {
    it('formats whole seconds as HH:MM:SS.mmm', () => {
        expect(vttTimestamp(0)).toBe('00:00:00.000')
        expect(vttTimestamp(5)).toBe('00:00:05.000')
        expect(vttTimestamp(65)).toBe('00:01:05.000')
        expect(vttTimestamp(3661)).toBe('01:01:01.000')
    })

    it('renders milliseconds with rounding', () => {
        expect(vttTimestamp(1.5)).toBe('00:00:01.500')
        expect(vttTimestamp(2.0009)).toBe('00:00:02.001')
        expect(vttTimestamp(12.345)).toBe('00:00:12.345')
    })

    it('clamps negative input to zero', () => {
        expect(vttTimestamp(-3)).toBe('00:00:00.000')
    })
})

describe('segmentsToVtt', () => {
    it('builds a valid WebVTT document with cue timing', () => {
        const segments: TranscriptSegment[] = [
            { start: 0, end: 3.5, text: 'Hello, I am a weaver.' },
            { start: 3.5, end: 6, text: 'I learned from my grandmother.' },
        ]
        const vtt = segmentsToVtt(segments)
        expect(vtt.startsWith('WEBVTT\n\n')).toBe(true)
        expect(vtt).toContain('00:00:00.000 --> 00:00:03.500\nHello, I am a weaver.')
        expect(vtt).toContain('00:00:03.500 --> 00:00:06.000\nI learned from my grandmother.')
    })

    it('drops empty/whitespace-only cues and trims text', () => {
        const segments: TranscriptSegment[] = [
            { start: 0, end: 1, text: '   ' },
            { start: 1, end: 2, text: '  kept  ' },
        ]
        const vtt = segmentsToVtt(segments)
        expect(vtt).not.toContain('-->\n   ')
        expect(vtt).toContain('00:00:01.000 --> 00:00:02.000\nkept')
        // Only one cue survived.
        expect(vtt.match(/-->/g)?.length).toBe(1)
    })

    it('collapses newlines inside a cue to keep it single-line', () => {
        const segments: TranscriptSegment[] = [{ start: 0, end: 1, text: 'line one\nline two' }]
        const vtt = segmentsToVtt(segments)
        expect(vtt).toContain('line one line two')
    })

    it('escapes VTT markup characters in cue text', () => {
        const segments: TranscriptSegment[] = [{ start: 0, end: 1, text: 'a < b & c > d' }]
        const vtt = segmentsToVtt(segments)
        expect(vtt).toContain('a &lt; b &amp; c &gt; d')
    })

    it('returns a header-only document for no segments', () => {
        expect(segmentsToVtt([])).toBe('WEBVTT\n\n\n')
    })
})
