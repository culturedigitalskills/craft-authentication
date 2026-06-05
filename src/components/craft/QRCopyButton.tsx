'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function QRCopyButton({ url, label, copiedLabel }: { url: string; label: string; copiedLabel: string }) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // fallback for browsers without clipboard API
        }
    }

    return (
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied
                ? <><Check className="h-4 w-4 text-warm" />{copiedLabel}</>
                : <><Copy className="h-4 w-4" />{label}</>
            }
        </Button>
    )
}
