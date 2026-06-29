'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

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
        <button type="button" onClick={handleCopy} className="sc-btn sc-btn--primary justify-center">
            {copied
                ? <><Check className="h-4 w-4" />{copiedLabel}</>
                : <><Copy className="h-4 w-4" />{label}</>
            }
        </button>
    )
}
