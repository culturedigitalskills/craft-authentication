import { defineRouting } from 'next-intl/routing'
import { locales } from './locales'

export const routing = defineRouting({
    locales,
    defaultLocale: 'en',
    localePrefix: 'as-needed',
    // A URL always identifies one language, regardless of cookies or headers.
    localeDetection: false,
    localeCookie: false,
    // Only genuinely translated editorial pages publish alternates, in metadata.
    alternateLinks: false,
})
