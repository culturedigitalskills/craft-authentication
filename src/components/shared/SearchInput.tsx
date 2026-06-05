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
        <div className="relative max-w-sm">
            <Search
                aria-hidden="true"
                className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
                    isPending ? 'text-warm' : 'text-muted-foreground'
                }`}
            />
            <input
                type="text"
                defaultValue={value}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm/30 focus-visible:ring-offset-2"
            />
        </div>
    )
}
