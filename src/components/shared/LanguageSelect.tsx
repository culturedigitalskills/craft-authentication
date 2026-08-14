'use client'

import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { routing } from '@/i8n/routing'
// next-intl's navigation wrappers rather than next/navigation: passing an
// explicit locale to replace() writes the NEXT_LOCALE cookie before navigating,
// so the new locale is already in place when the request goes out.
import { useRouter, usePathname } from '@/i8n/navigation'

export interface Language {
    code: (typeof routing.locales)[number]
    name: string
}

export const languages: Language[] = routing.locales.map((locale) => ({
    code: locale,
    name: locale.toUpperCase(),
}))

interface LanguageSelectProps {
    isMobile: boolean
    jsonlan: string
}

export function LanguageSelect({ isMobile, jsonlan }: LanguageSelectProps) {
    const router = useRouter()
    const pathname = usePathname()

    const handleLanguageChange = (lang: Language) => {
        // localePrefix is 'never', so the locale lives in a cookie and the URL is
        // identical before and after a switch. The client router cache is keyed by
        // URL and knows nothing about that cookie, so without refresh() it can
        // replay the page in the previous language. Most visible when switching
        // back to a language already visited, or when switching rapidly.
        router.replace(pathname, { locale: lang.code, scroll: false })
        router.refresh()
    }

    return (
        <div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className={`flex items-center space-x-1 primary-foreground focus:ring-0 ${
                            isMobile ? 'border border-gray-600' : ''
                        }`}
                    >
                        {jsonlan.toUpperCase()}
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="flex flex-col columns-4xs primary-foreground border-gray-200 text-center">
                    {languages.map((lang) => (
                        <DropdownMenuItem
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang)}
                            className="text-1xl text-inherit hover:text-neutral-400 text-center"
                        >
                            {lang.name}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
