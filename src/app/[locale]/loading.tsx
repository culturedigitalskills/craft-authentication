export default function Loading() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            {/* Spinner only — loading.tsx renders outside the locale message
                context, so any text here would be untranslated. */}
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
    )
}
