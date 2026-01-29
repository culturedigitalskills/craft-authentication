import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Geist, Geist_Mono } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import {routing} from '@/i8n/routing'
//we are using the css in the main app folder
import '../globals.css'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};



export default async function LocaleLayout({ children, params }: Props) {
// Ensure that the incoming `locale` is valid
    const {locale} = await params;

    if (!hasLocale(routing.locales, locale)) {
    notFound();
    }
    return (
        <html lang={`/${locale}`} suppressHydrationWarning>
            <head>
                <link href="/favicon.ico" rel="icon" sizes="32x32" />
                <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
            </head>

            <body
                className={cn(
                    'min-h-screen bg-background font-sans antialiased',
                    geistSans.variable,
                    geistMono.variable,
                )}
            >
                    <div className="flex min-h-screen flex-col">
                        <Header />
                        <main className="flex-1">
                            {children}
                        </main>
                        <Footer />
                    </div>
            </body>
        </html>
    )
}
