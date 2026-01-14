import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = ['en', 'hi'] as const
export const defaultLocale = 'en' as const

export default getRequestConfig(async ({ requestLocale }) => {

    let locale = await requestLocale

    // Ensure that a valid locale is used
    if (!locale || !locales.includes(locale as any)) {
        locale = defaultLocale
    }


    const messages = (await import(`../messages/${locale}.json`)).default;

    return {
        locale,
        messages,
    }
})
