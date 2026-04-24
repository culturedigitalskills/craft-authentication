"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
    currentPage: number
    pagination: { currentPage: number; totalPages: number; totalCount?: number; hasNext: boolean; hasPrev: boolean }
    currentPageUrl: string
}

export default function PaginationControls({ currentPage, pagination, currentPageUrl }: PaginationProps) {
    const [inputPage, setInputPage] = useState(String(currentPage))
    const router = useRouter()
    const searchParams = useSearchParams()
    const q = searchParams.get('q')

    useEffect(() => {
        setInputPage(String(currentPage))
    }, [currentPage])

    function buildUrl(page: number) {
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        params.set('page', String(page))
        return `${currentPageUrl}?${params.toString()}`
    }

    const handlePageSubmit = () => {
        const page = parseInt(inputPage)
        if (page >= 1 && page <= pagination.totalPages) {
            router.push(buildUrl(page))
        }
    }

    if (pagination.totalPages <= 1) return null

    return (
        <div className="mt-10 flex flex-col items-center gap-3">
            {pagination.totalCount !== undefined && (
                <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {pagination.totalPages}
                    {' '}· {pagination.totalCount} total
                </p>
            )}
            <div className="flex items-center gap-2">
                <Link
                    href={buildUrl(currentPage - 1)}
                    aria-disabled={!pagination.hasPrev}
                    className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted ${
                        !pagination.hasPrev ? 'pointer-events-none cursor-not-allowed opacity-40' : ''
                    }`}
                >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Previous
                </Link>

                <div className="flex items-center gap-1.5">
                    <input
                        type="number"
                        min={1}
                        max={pagination.totalPages}
                        value={inputPage}
                        onChange={(e) => setInputPage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePageSubmit()}
                        className="w-14 rounded-md border px-2 py-2 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm/30"
                    />
                    <span className="text-sm text-muted-foreground">/ {pagination.totalPages}</span>
                    <button
                        onClick={handlePageSubmit}
                        aria-label="Go to page"
                        className="rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        Go
                    </button>
                </div>

                <Link
                    href={buildUrl(currentPage + 1)}
                    aria-disabled={!pagination.hasNext}
                    className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted ${
                        !pagination.hasNext ? 'pointer-events-none cursor-not-allowed opacity-40' : ''
                    }`}
                >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </div>
    )
}
