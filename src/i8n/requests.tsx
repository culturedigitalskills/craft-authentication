//https://next-intl.dev/docs/routing/setup
import { getRequestConfig } from 'next-intl/server'
import {hasLocale} from 'next-intl';
import {routing} from './routing';

type MessageNode = string | MessageNode[] | { [key: string]: MessageNode }
type MessageRecord = { [key: string]: MessageNode }

function isPlainObject(value: MessageNode | undefined): value is MessageRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Overlay a locale's messages on top of English. Catalogs drift behind en.json
 * whenever a feature lands, and next-intl renders the raw key path for anything
 * missing. Falling back to English keeps those screens readable, and lets
 * English-only content (the legal pages) ship without copying the same text
 * into every catalog.
 *
 * Arrays are replaced wholesale rather than merged, so a translated list never
 * turns into an object keyed by index.
 */
function withFallback(fallback: MessageRecord, messages: MessageRecord): MessageRecord {
    const merged: MessageRecord = { ...fallback }

    for (const [key, value] of Object.entries(messages)) {
        const base = merged[key]
        merged[key] =
            isPlainObject(value) && isPlainObject(base) ? withFallback(base, value) : value
    }

    return merged
}

export default getRequestConfig(async ({ requestLocale }) => {

    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested)
        ? requested
        : routing.defaultLocale;

    const messages = (await import(`../../messages/${locale}.json`)).default;

    if (locale === routing.defaultLocale) {
        return { locale, messages }
    }

    const fallback = (await import('../../messages/en.json')).default;

    return {
        locale,
        messages: withFallback(fallback as MessageRecord, messages as MessageRecord)
    }
})
