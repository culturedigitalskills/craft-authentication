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
import { loginRequestSchema } from '@/lib/validations/auth'

type LoginFormData = z.infer<typeof loginRequestSchema>

export function LoginForm() {
    const t = useTranslations('auth')
    const router = useRouter()
    const [serverError, setServerError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginRequestSchema),
        mode: 'onBlur',
    })

    async function onSubmit(data: LoginFormData) {
        setServerError(null)

        const result = await signIn('credentials', {
            email: data.email,
            password: data.password,
            redirect: false,
        })

        if (result?.error) {
            setServerError(t('invalidCredentials'))
        } else {
            router.push('/crafts')
            router.refresh()
        }
    }

    return (
        <Card className="mx-auto max-w-md">
            <CardHeader>
                <CardTitle>{t('loginTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {serverError && (
                        <div className="rounded bg-red-50 p-3 text-sm text-red-500">
                            {serverError}
                        </div>
                    )}
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
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t('signingIn') : t('login')}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        {t('noAccount')}{' '}
                        <Link
                            href="/register"
                            className="text-primary hover:underline"
                        >
                            {t('register')}
                        </Link>
                    </p>
                </form>
            </CardContent>
        </Card>
    )
}
