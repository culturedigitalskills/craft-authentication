import { describe, it, expect } from 'vitest'
import { baseMimeType, extFromMime } from '@/components/onboarding/RecorderControl'

describe('baseMimeType', () => {
    it('strips the codecs suffix and lowercases', () => {
        expect(baseMimeType('video/webm;codecs=vp9,opus')).toBe('video/webm')
        expect(baseMimeType('audio/webm;codecs=opus')).toBe('audio/webm')
        expect(baseMimeType('VIDEO/MP4')).toBe('video/mp4')
    })

    it('leaves a bare mime unchanged', () => {
        expect(baseMimeType('audio/mp4')).toBe('audio/mp4')
    })
})

describe('extFromMime', () => {
    it('maps webm audio and video to .webm (there is no .weba in the allowlist)', () => {
        expect(extFromMime('audio/webm;codecs=opus')).toBe('webm')
        expect(extFromMime('video/webm;codecs=vp9,opus')).toBe('webm')
    })

    it('maps mp4 containers to their allowlisted extensions', () => {
        expect(extFromMime('audio/mp4')).toBe('m4a')
        expect(extFromMime('audio/x-m4a')).toBe('m4a')
        expect(extFromMime('video/mp4')).toBe('mp4')
    })

    it('falls back to webm for unknown or empty types', () => {
        expect(extFromMime('')).toBe('webm')
        expect(extFromMime('application/octet-stream')).toBe('webm')
    })
})
