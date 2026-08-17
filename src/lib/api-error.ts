export type FieldIssue = {
    path: string
    message: string
}

export type ParsedApiError = {
    error: string
    issues: FieldIssue[]
}

/**
 * Parse an error response from our API routes. Handles both the basic shape
 * ({ error }) and the validation shape produced by handleValidationError
 * ({ error, details: [{ path, message, code }] }). Safe against non-JSON bodies.
 */
export async function parseApiError(res: Response): Promise<ParsedApiError> {
    const body: unknown = await res.json().catch(() => null)

    if (!body || typeof body !== 'object') {
        return { error: '', issues: [] }
    }

    const { error, details } = body as { error?: unknown; details?: unknown }
    const issues: FieldIssue[] = Array.isArray(details)
        ? details
              .filter(
                  (d): d is { path: string; message: string } =>
                      !!d && typeof d.path === 'string' && typeof d.message === 'string',
              )
              .map((d) => ({ path: d.path, message: d.message }))
        : []

    return { error: typeof error === 'string' ? error : '', issues }
}
