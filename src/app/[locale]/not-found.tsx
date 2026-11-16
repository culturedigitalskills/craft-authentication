import { useTranslations as useInterfaceTranslations } from 'next-intl'
import { Link } from '@/i8n/navigation'
import { FileQuestion } from 'lucide-react'

export default function NotFoundPage() {
    const tui = useInterfaceTranslations('interface')

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-2xl font-bold">{tui('pageNotFound')}</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
                {tui('thePageYouAreLookingForDoesNotExist')}
            </p>
            <Link
                href="/"
                className="rounded-md bg-warm px-6 py-2.5 text-sm font-medium text-warm-foreground transition-colors hover:bg-warm/90"
            >
                {tui('goHome')}
            </Link>
        </div>
    )
}
