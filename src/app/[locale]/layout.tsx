import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Geist, Geist_Mono } from 'next/font/google'
import '../globals.css'
import { cn } from '@/lib/utils'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

const locales = ['en', 'hi']

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }))
}

export const metadata = {
    title: 'Sustainable Crafting',
    description: 'Authentic Cultural Products - Connect with artisans worldwide',
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params

    if (!locales.includes(locale)) {
        notFound()
    }

    const messages = await getMessages({ locale })

    return (
        <html lang={locale} suppressHydrationWarning>
            <body
                className={cn(
                    'min-h-screen bg-background font-sans antialiased',
                    geistSans.variable,
                    geistMono.variable,
                )}
            >
                <NextIntlClientProvider messages={messages}>
                    <div className="flex min-h-screen flex-col">
                        <Header />
                        <main className="flex-1">
                            {children}
                        </main>
                        <Footer />
                    </div>
                </NextIntlClientProvider>
            </body>
        </html>
    )
}
