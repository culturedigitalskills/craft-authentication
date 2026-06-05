'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Unhandled error:', error)
    }, [error])

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
                An unexpected error occurred. Please try again.
            </p>
            <button
                onClick={reset}
                className="rounded-md bg-warm px-6 py-2.5 text-sm font-medium text-warm-foreground transition-colors hover:bg-warm/90"
            >
                Try again
            </button>
        </div>
    )
}
