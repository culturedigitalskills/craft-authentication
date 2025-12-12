import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export type ErrorResponse = {
    error: string
    details?: any
}

export function handleValidationError(error: ZodError): NextResponse<ErrorResponse> {
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
            })),
        },
        { status: 400 },
    )
}

export function errorResponse(message: string, status = 500): NextResponse<ErrorResponse> {
    return NextResponse.json({ error: message }, { status })
}
