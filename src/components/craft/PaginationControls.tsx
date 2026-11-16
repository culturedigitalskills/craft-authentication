'use client'
import { useTranslations, useFormatter } from 'next-intl'
import { useState, useEffect } from 'react'
import { Link } from '@/i8n/navigation'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/i8n/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
    currentPage: number
    pagination: {
        currentPage: number
        totalPages: number
        totalCount?: number
        hasNext: boolean
        hasPrev: boolean
    }
    currentPageUrl: string
}

export default function PaginationControls({
    currentPage,
    pagination,
    currentPageUrl,
}: PaginationProps) {
    const tui = useTranslations('interface')
    const format = useFormatter()
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

    const pillStyle = { borderColor: 'var(--sc-border-strong)', color: 'var(--sc-text-soft)' }

    return (
        <div className="mt-12 flex flex-col items-center gap-3">
            {pagination.totalCount !== undefined && (
                <p className="sc-meta">
                    {tui('pageSummary', {
                        page: format.number(currentPage),
                        pages: format.number(pagination.totalPages),
                        count: pagination.totalCount,
                    })}
                </p>
            )}
            <div className="flex items-center gap-2">
                <Link
                    href={buildUrl(currentPage - 1)}
                    aria-disabled={!pagination.hasPrev}
                    className={`inline-flex items-center gap-1 rounded-[var(--sc-r-btn)] border px-3 py-2 text-sm transition-colors ${
                        !pagination.hasPrev
                            ? 'pointer-events-none cursor-not-allowed opacity-40'
                            : ''
                    }`}
                    style={pillStyle}
                >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    {tui('previous')}
                </Link>

                <div className="flex items-center gap-1.5">
                    <input
                        type="number"
                        aria-label={tui('pageNumber')}
                        min={1}
                        max={pagination.totalPages}
                        value={inputPage}
                        onChange={(e) => setInputPage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePageSubmit()}
                        className="w-14 rounded-[var(--sc-r-btn)] border px-2 py-2 text-center text-sm focus-visible:outline-none focus-visible:ring-2"
                        style={pillStyle}
                    />
                    <span className="sc-meta">/ {format.number(pagination.totalPages)}</span>
                    <button
                        onClick={handlePageSubmit}
                        aria-label={tui('goToPage')}
                        className="rounded-[var(--sc-r-btn)] border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
                        style={pillStyle}
                    >
                        {tui('go')}
                    </button>
                </div>

                <Link
                    href={buildUrl(currentPage + 1)}
                    aria-disabled={!pagination.hasNext}
                    className={`inline-flex items-center gap-1 rounded-[var(--sc-r-btn)] border px-3 py-2 text-sm transition-colors ${
                        !pagination.hasNext
                            ? 'pointer-events-none cursor-not-allowed opacity-40'
                            : ''
                    }`}
                    style={pillStyle}
                >
                    {tui('next')}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </div>
    )
}
