// Pure HTTP Range header parsing (RFC 9110 byte ranges) — no I/O, so it's
// cheap to unit test and safe to load in any route.

export type ParsedRange =
    // A satisfiable single byte range, inclusive bounds, end clamped to size - 1.
    | { kind: 'range'; start: number; end: number }
    // Syntactically valid but no overlap with the resource → respond 416.
    | { kind: 'unsatisfiable' }
    // Absent, malformed, or multi-range → ignore and serve the full body (a
    // server MAY ignore Range; browsers never send multi-range for media).
    | { kind: 'none' }

export function parseRangeHeader(header: string | null, size: number): ParsedRange {
    if (!header) return { kind: 'none' }

    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
    if (!match) return { kind: 'none' }
    const [, startStr, endStr] = match
    if (startStr === '' && endStr === '') return { kind: 'none' }

    // bytes=-suffix — the last `suffix` bytes of the resource.
    if (startStr === '') {
        const suffix = Number(endStr)
        if (suffix === 0 || size === 0) return { kind: 'unsatisfiable' }
        return { kind: 'range', start: Math.max(size - suffix, 0), end: size - 1 }
    }

    const start = Number(startStr)
    if (start >= size) return { kind: 'unsatisfiable' }

    // bytes=start- runs to the end; bytes=start-end is clamped to the resource.
    const end = endStr === '' ? size - 1 : Math.min(Number(endStr), size - 1)
    if (start > end) return { kind: 'none' }

    return { kind: 'range', start, end }
}
