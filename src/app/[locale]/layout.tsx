import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Geist, Geist_Mono } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
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
    const messages = await getMessages();

    if (!hasLocale(routing.locales, locale)) {
    notFound();
    }

    // A signed-in user with no artisan profile still needs onboarding — surface a
    // "Complete your profile" entry point in the nav so it's reachable after skipping.
    const session = await auth()
    let needsOnboarding = false
    if (session?.user) {
        const artisan = await prisma.artisan.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        })
        needsOnboarding = !artisan
    }
    return (
        <html lang={`/${locale}`} suppressHydrationWarning>
            <head>
                <link href="/favicon.ico" rel="icon" sizes="32x32" />
                <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
                {/* Sustainable Crafting type — Spectral (display), Hanken Grotesque (body), Caveat (accent) */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Hanken+Grotesque:wght@400;500;600;700&family=Caveat:wght@600;700&display=swap"
                    rel="stylesheet"
                />
            </head>

            <body
                className={cn(
                    'min-h-screen overflow-x-hidden antialiased',
                    geistSans.variable,
                    geistMono.variable,
                )}
            >


                        <ThemeProvider
                            attribute="class"
                            defaultTheme="light"
                            forcedTheme="light"
                            enableSystem={false}
                            disableTransitionOnChange
                        >                    
                        <SessionProvider>
                        <NextIntlClientProvider messages={messages}>
                            <div className="sc-page flex min-h-screen flex-col">
                                <div className="sc-grain" />
                                <Header needsOnboarding={needsOnboarding} />
                                <main className="flex-1">
                                    {children}
                                </main>
                                <Footer />
                            </div>
                        </NextIntlClientProvider>
                    </SessionProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
