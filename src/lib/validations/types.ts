import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export type BasicErrorResponse = {
    error: string
    message?: string
}

export type ValidationErrorResponse = {
    error: string
    details: {
        path: string
        message: string
        code: string
        origin?: string
        minimum?: number
        maximum?: number
    }[]
}

export type RateLimitErrorResponse = {
    error: string
    message: string
    retryAfter: number
}

export type ErrorResponse = BasicErrorResponse | ValidationErrorResponse | RateLimitErrorResponse

export function handleValidationError(error: ZodError): NextResponse<ValidationErrorResponse> {
    // ZodError uses `.issues`, not `.errors`
    const issues = (error as ZodError).issues ?? []
    const firstError = issues[0]
    const message = firstError
        ? `${(firstError.path || []).join('.') || 'root'}: ${firstError.message}`
        : 'Validation failed'

    return NextResponse.json(
        {
            error: message,
            details: issues.map((issue) => ({
                path: (issue.path || []).join('.') || 'root',
                message: issue.message,
                code: issue.code,
                ...('origin' in issue && typeof issue.origin === 'string'
                    ? { origin: issue.origin }
                    : {}),
                ...('minimum' in issue && typeof issue.minimum === 'number'
                    ? { minimum: issue.minimum }
                    : {}),
                ...('maximum' in issue && typeof issue.maximum === 'number'
                    ? { maximum: issue.maximum }
                    : {}),
            })),
        },
        { status: 400 },
    )
}

export function errorResponse(message: string, status = 500): NextResponse<BasicErrorResponse> {
    return NextResponse.json({ error: message }, { status })
}
