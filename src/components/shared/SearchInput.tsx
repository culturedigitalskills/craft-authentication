'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { useTransition } from 'react'

interface SearchInputProps {
    placeholder: string
}

export function SearchInput({ placeholder }: SearchInputProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const value = searchParams.get('q') ?? ''

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const params = new URLSearchParams(searchParams.toString())
        if (e.target.value) {
            params.set('q', e.target.value)
        } else {
            params.delete('q')
        }
        params.delete('page')
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`, { scroll: false })
        })
    }

    return (
        <div className="relative w-full max-w-sm">
            <Search
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors"
                style={{ color: isPending ? 'var(--sc-accent)' : 'var(--sc-text-muted)' }}
            />
            <input
                type="text"
                defaultValue={value}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full rounded-[var(--sc-r-chip)] border py-2.5 pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2"
                style={{
                    background: 'var(--sc-surface)',
                    borderColor: 'var(--sc-border-strong)',
                    color: 'var(--sc-text)',
                }}
            />
        </div>
    )
}
