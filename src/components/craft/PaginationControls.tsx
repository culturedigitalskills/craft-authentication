"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type PaginationProps = {
  currentPage: number
  pagination: { currentPage: number, totalPages: number, hasNext: boolean, hasPrev: boolean }
  currentPageUrl: string
}

export default function PaginationControls({ currentPage, pagination, currentPageUrl }: PaginationProps) {
  const [inputPage, setInputPage] = useState(String(currentPage))
  const router = useRouter()
  // sync inputPage when currentPage changes
  useEffect(() => {
    setInputPage(String(currentPage))
  }, [currentPage])

  const handlePageSubmit = () => {
    const page = parseInt(inputPage)
    if (page >= 1 && page <= pagination.totalPages) {
      router.push(`${currentPageUrl}?page=${page}`)
    }
  }

  return (
    <div className="flex justify-center items-center gap-4 mt-8">
      <Link 
        href={`${currentPageUrl}?page=${currentPage - 1}`}
        className={`px-4 py-2 border rounded ${!pagination.hasPrev ? 'pointer-events-none opacity-50' : ''}`}
      >
        Previous
      </Link>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={pagination.totalPages}
          value={inputPage}
          onChange={(e) => setInputPage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handlePageSubmit()}
          className="w-16 px-2 py-2 border rounded text-center"
        />
        <span className="py-2">/ {pagination.totalPages}</span>
        <button
          onClick={handlePageSubmit}
          className="px-3 py-2 border rounded hover:bg-muted"
        >
          Go
        </button>
      </div>

      <Link 
        href={`${currentPageUrl}?page=${currentPage + 1}`}
        className={`px-4 py-2 border rounded ${!pagination.hasNext ? 'pointer-events-none opacity-50' : ''}`}
      >
        Next
      </Link>
    </div>
  )
}