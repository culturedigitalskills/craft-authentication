'use client'

import { useState } from 'react'
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

export function RegisterForm() {
    const t = useTranslations('auth')
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (password !== confirmPassword) {
            setError(t('passwordMismatch'))
            setLoading(false)
            return
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                if (res.status === 409) {
                    setError(t('emailExists'))
                } else {
                    setError(data.error || t('registrationFailed'))
                }
                setLoading(false)
                return
            }

            const result = await signIn('credentials', {
                email: formData.get('email') as string,
                password,
                redirect: false,
            })

            setLoading(false)

            if (result?.error) {
                router.push('/login')
                router.refresh()
            } else {
                router.push('/crafts')
                router.refresh()
            }
        } catch {
            setError(t('registrationFailed'))
            setLoading(false)
        }
    }

    return (
        <Card className="mx-auto max-w-md">
            <CardHeader>
                <CardTitle>{t('registerTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded bg-red-50 p-3 text-sm text-red-500">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('name')}</Label>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('email')}</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">{t('password')}</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={8}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">
                            {t('confirmPassword')}
                        </Label>
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            minLength={8}
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? t('registering') : t('register')}
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
