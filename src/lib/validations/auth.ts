import { z } from 'zod'

/**
 * Schema for user registration request
 * POST /api/auth/register
 */
export const registerRequestSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    email: z.email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must be less than 100 characters'),
})

/**
 * Schema for user login/credentials request
 * Used by NextAuth Credentials provider
 */
export const loginRequestSchema = z.object({
    email: z.email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * Schema for user response object (safe user data without sensitive fields)
 */
export const userResponseSchema = z.object({
    id: z.uuid(),
    name: z.string().nullable(),
    email: z.email(),
    image: z.string().nullable().optional(),
})

/**
 * Schema for successful registration response
 * POST /api/auth/register - 201 Created
 */
export const registerResponseSchema = z.object({
    user: userResponseSchema,
})

/**
 * Schema for login/auth response
 * Used by NextAuth after successful authentication
 */
export const authResponseSchema = z.object({
    id: z.uuid(),
    name: z.string().nullable(),
    email: z.email(),
    image: z.string().nullable().optional(),
})

/**
 * Schema for API error responses
 */
export const authErrorResponseSchema = z.object({
    error: z.string(),
    details: z
        .array(
            z.object({
                path: z.string(),
                message: z.string(),
                code: z.string(),
            }),
        )
        .optional(),
})

/**
 * Schema for generic error response (simpler format)
 */
export const simpleErrorResponseSchema = z.object({
    error: z.string(),
})

/**
 * Schema for JWT token payload
 */
export const jwtTokenSchema = z.object({
    sub: z.uuid().optional(),
    iat: z.number().optional(),
    exp: z.number().optional(),
})

/**
 * Schema for NextAuth Session
 */
export const sessionSchema = z.object({
    user: z.object({
        id: z.uuid(),
        name: z.string().nullable(),
        email: z.email(),
        image: z.string().nullable(),
    }),
    expires: z.string(),
})

export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>

export type UserResponse = z.infer<typeof userResponseSchema>
export type RegisterResponse = z.infer<typeof registerResponseSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>

export type AuthErrorResponse = z.infer<typeof authErrorResponseSchema>
export type SimpleErrorResponse = z.infer<typeof simpleErrorResponseSchema>

export type JWTToken = z.infer<typeof jwtTokenSchema>
export type Session = z.infer<typeof sessionSchema>
