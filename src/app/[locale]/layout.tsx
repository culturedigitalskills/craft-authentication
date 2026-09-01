import { Suspense } from 'react'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Geist, Geist_Mono, Spectral, Caveat } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import NextTopLoader from 'nextjs-toploader'
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

// Display face for headings. Self-hosted at build time by next/font so no
// request reaches Google when someone loads a page. Weights and styles mirror
// what the old stylesheet link requested, so the rendering is unchanged.
const spectral = Spectral({
    variable: '--font-spectral',
    subsets: ['latin', 'latin-ext'],
    weight: ['400', '500', '600', '700'],
    style: ['normal', 'italic'],
    display: 'swap',
})

// Accent face behind .sc-quote (the pull quote on a craft page).
const caveat = Caveat({
    variable: '--font-caveat',
    subsets: ['latin', 'latin-ext'],
    weight: ['600', '700'],
    display: 'swap',
})

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};



// A signed-in user with no artisan profile still needs onboarding — surface a
// "Complete your profile" entry point in the nav so it's reachable after
// skipping. Streamed behind Suspense so the session + profile lookup never
// blocks the page shell: the header renders immediately without the badge and
// re-renders with it once the lookup resolves.
async function OnboardingAwareHeader() {
    const session = await auth()
    let needsOnboarding = false
    if (session?.user) {
        const artisan = await prisma.artisan.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        })
        needsOnboarding = !artisan
    }
    return <Header needsOnboarding={needsOnboarding} />
}

export default async function LocaleLayout({ children, params }: Props) {
// Ensure that the incoming `locale` is valid
    const {locale} = await params;
    const messages = await getMessages();

    if (!hasLocale(routing.locales, locale)) {
    notFound();
    }

    return (
        <html lang={`${locale}`} suppressHydrationWarning>
            <head>
                <link href="/favicon.ico" rel="icon" sizes="32x32" />
                <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
            </head>

            <body
                suppressHydrationWarning
                className={cn(
                    'min-h-screen overflow-x-hidden antialiased',
                    geistSans.variable,
                    geistMono.variable,
                    spectral.variable,
                    caveat.variable,
                )}
            >


                {/* Slim top progress bar during navigation — the page stays
                    visible instead of swapping to a full-screen spinner. */}
                <NextTopLoader color="#bb5a2c" height={3} showSpinner={false} />
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
                                <Suspense fallback={<Header />}>
                                    <OnboardingAwareHeader />
                                </Suspense>
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
