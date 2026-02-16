import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import {
    registerRequestSchema,
    registerResponseSchema,
    type RegisterResponse,
} from '@/lib/validations/auth'
import { handleValidationError, errorResponse } from '@/lib/validations/types'

export async function POST(
    request: NextRequest,
): Promise<NextResponse<RegisterResponse | { error: string }>> {
    try {
        const body = await request.json()
        const { name, email, password } = registerRequestSchema.parse(body)

        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 },
            )
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        })

        const response: RegisterResponse = {
            user: { id: user.id, name: user.name, email: user.email },
        }
        return NextResponse.json(response, { status: 201 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleValidationError(error)
        }
        console.error('Registration error:', error)
        return errorResponse('Internal server error', 500)
    }
}
