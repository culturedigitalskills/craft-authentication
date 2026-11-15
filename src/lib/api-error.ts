export type FieldIssue = {
    path: string
    message: string
    code?: string
    origin?: string
    minimum?: number
    maximum?: number
}

export type ParsedApiError = {
    error: string
    status: number
    issues: FieldIssue[]
}

export async function parseApiError(res: Response): Promise<ParsedApiError> {
    const body: unknown = await res.json().catch(() => null)
    if (!body || typeof body !== 'object') return { error: '', status: res.status, issues: [] }
    const { error, details } = body as { error?: unknown; details?: unknown }
    const issues: FieldIssue[] = []
    if (Array.isArray(details)) {
        for (const item of details) {
            if (!item || typeof item.path !== 'string' || typeof item.message !== 'string') continue
            issues.push({
                path: item.path,
                message: item.message,
                code: typeof item.code === 'string' ? item.code : undefined,
                origin: typeof item.origin === 'string' ? item.origin : undefined,
                minimum: typeof item.minimum === 'number' ? item.minimum : undefined,
                maximum: typeof item.maximum === 'number' ? item.maximum : undefined,
            })
        }
    }
    return { error: typeof error === 'string' ? error : '', status: res.status, issues }
}

type ErrorKey =
    | 'invalidFields'
    | 'signInRequired'
    | 'actionNotAllowed'
    | 'itemNotFound'
    | 'conflictingChange'
    | 'uploadTooLarge'
    | 'tooManyRequests'
    | 'requestFailed'
    | 'invalidField'
    | 'minLength'
    | 'maxLength'
    | 'minItems'
    | 'maxItems'
    | 'minValue'
    | 'maxValue'
type Translate = (key: ErrorKey, values?: Record<string, string | number>) => string

export function httpErrorMessage(status: number, t: Translate): string {
    const keys: Record<number, ErrorKey> = {
        400: 'invalidFields',
        401: 'signInRequired',
        403: 'actionNotAllowed',
        404: 'itemNotFound',
        409: 'conflictingChange',
        413: 'uploadTooLarge',
        429: 'tooManyRequests',
    }
    return t(keys[status] || 'requestFailed')
}

export function fieldIssueMessage(issue: FieldIssue, t: Translate): string {
    if (issue.code === 'too_small' && issue.minimum !== undefined) {
        const key =
            issue.origin === 'string'
                ? 'minLength'
                : issue.origin === 'array'
                  ? 'minItems'
                  : 'minValue'
        return t(key, { limit: issue.minimum })
    }
    if (issue.code === 'too_big' && issue.maximum !== undefined) {
        const key =
            issue.origin === 'string'
                ? 'maxLength'
                : issue.origin === 'array'
                  ? 'maxItems'
                  : 'maxValue'
        return t(key, { limit: issue.maximum })
    }
    return t('invalidField')
}
