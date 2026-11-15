/** Supported interface locales and their native selector labels. */
export const languageNames = {
    en: 'English',
    hi: 'हिन्दी',
    es: 'Español',
    ar: 'العربية',
    de: 'Deutsch',
    tr: 'Türkçe',
    el: 'Ελληνικά',
    ja: '日本語',
    fr: 'Français',
    it: 'Italiano',
    'pt-BR': 'Português (Brasil)',
} as const

export type SiteLocale = keyof typeof languageNames
export const locales = Object.keys(languageNames) as SiteLocale[]
