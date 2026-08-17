/**
 * Progress dots for the multi-step wizards. `current` is a zero-based index;
 * the active dot widens, completed dots stay tinted, upcoming ones are muted.
 */
export function StepDots({ current, total }: { current: number; total: number }) {
    return (
        <div className="mb-2 flex justify-center gap-2">
            {Array.from({ length: total }, (_, i) => i).map(n => (
                <span
                    key={n}
                    className={`h-2 w-2 rounded-full transition-all ${
                        n === current ? 'w-8 bg-primary' : n < current ? 'bg-primary/40' : 'bg-muted'
                    }`}
                />
            ))}
        </div>
    )
}
