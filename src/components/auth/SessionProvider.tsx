'use client'

import { useEffect } from 'react'
import { useSession } from '@/lib/auth-client'
import { watchAccountErasure } from '@/lib/erasure-browser'

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const { data } = useSession()
    useEffect(() => watchAccountErasure(data?.user.id), [data?.user.id])
    return <>{children}</>
}
