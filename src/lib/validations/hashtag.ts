/** Canonicalize new hashtag input without translating or changing existing records. */
export function normalizeHashtag(value: string): string {
    return value.replace(/^#/, '').trim().normalize('NFC')
}

export function isValidHashtag(value: string): boolean {
    return /^[\p{L}\p{N}_][\p{L}\p{M}\p{N}_]{0,49}$/u.test(value)
}
