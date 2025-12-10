import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function Home() {
    return (
        <main className="container flex min-h-[calc(100vh-4rem)] flex-col justify-center gap-10 py-16">
            <section className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Welcome Page</p>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                    Craft Authentication
                </h1>
                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" asChild>
                        <Link href="https://github.com/karina-rodriguez/craft-authentication">
                            View repository
                        </Link>
                    </Button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                {[
                    {
                        title: 'Database ready',
                        description:
                            'Prisma wired to Postgres via env-driven URLs for dev and Docker.',
                    },
                    {
                        title: 'UI toolkit',
                        description:
                            'shadcn/ui with Tailwind v3, radix primitives, and reusable utilities.',
                    },
                ].map((item) => (
                    <div
                        key={item.title}
                        className="rounded-xl border bg-card p-5 shadow-sm transition hover:shadow"
                    >
                        <h2 className="text-xl font-semibold">{item.title}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                ))}
            </section>
        </main>
    )
}
