import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFoundPage() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-2xl font-bold">Page not found</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
                The page you are looking for does not exist or has been moved.
            </p>
            <Link
                href="/"
                className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
                Go home
            </Link>
        </div>
    )
}
