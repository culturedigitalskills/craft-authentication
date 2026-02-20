'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import { registerRequestSchema } from '@/lib/validations/auth'

const registerFormSchema = registerRequestSchema
    .extend({ confirmPassword: z.string().min(1) })
    .refine((data) => data.password === data.confirmPassword, {
        path: ['confirmPassword'],
    })

type RegisterFormData = z.infer<typeof registerFormSchema>

export function RegisterForm() {
    const t = useTranslations('auth')
    const router = useRouter()
    const [serverError, setServerError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerFormSchema),
        mode: 'onBlur',
    })

    async function onSubmit(data: RegisterFormData) {
        setServerError(null)

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    password: data.password,
                }),
            })

            if (!res.ok) {
                const json = await res.json()
                setServerError(
                    res.status === 409 ? t('emailExists') : (json.error || t('registrationFailed'))
                )
                return
            }

            const result = await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            })

            if (result?.error) {
                router.push('/login')
                router.refresh()
            } else {
                router.push('/crafts')
                router.refresh()
            }
        } catch {
            setServerError(t('registrationFailed'))
        }
    }

    return (
        <Card className="mx-auto max-w-md">
            <CardHeader>
                <CardTitle>{t('registerTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {serverError && (
                        <div className="rounded bg-red-50 p-3 text-sm text-red-500">
                            {serverError}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('name')}</Label>
                        <Input
                            id="name"
                            type="text"
                            aria-invalid={!!errors.name}
                            {...register('name')}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">
                                {t('validation.nameRequired')}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            aria-invalid={!!errors.email}
                            {...register('email')}
                        />
                        {errors.email && (
                            <p className="text-sm text-red-500">
                                {t('validation.emailInvalid')}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">{t('password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            aria-invalid={!!errors.password}
                            {...register('password')}
                        />
                        {errors.password && (
                            <p className="text-sm text-red-500">
                                {t('validation.passwordMin')}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">
                            {t('confirmPassword')}
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            aria-invalid={!!errors.confirmPassword}
                            {...register('confirmPassword')}
                        />
                        {errors.confirmPassword && (
                            <p className="text-sm text-red-500">
                                {t('validation.passwordMismatch')}
                            </p>
                        )}
                    </div>
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t('registering') : t('register')}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        {t('haveAccount')}{' '}
                        <Link
                            href="/login"
                            className="text-primary hover:underline"
                        >
                            {t('login')}
                        </Link>
                    </p>
                </form>
            </CardContent>
        </Card>
    )
}
