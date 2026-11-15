import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
    locales: ['en', 'hi', 'es', 'ar', 'de', 'tr', 'el'],
    defaultLocale: 'en',
    localePrefix: 'as-needed',
    // A URL always identifies one language, regardless of cookies or headers.
    localeDetection: false,
    localeCookie: false,
    // Only genuinely translated editorial pages publish alternates, in metadata.
    alternateLinks: false,
})
