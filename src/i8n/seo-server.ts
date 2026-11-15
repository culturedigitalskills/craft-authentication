import { getLocale, getTranslations } from 'next-intl/server'
import { publicMetadata, listingMetadata, type ListingQuery } from './seo'
import type { SiteLocale } from './language-switch'

export async function editorialMetadata(path: string, titleKey: string, descriptionKey: string) {
    const t = await getTranslations()
    return publicMetadata(
        path,
        (await getLocale()) as SiteLocale,
        t(titleKey),
        t(descriptionKey),
        true,
    )
}

export async function catalogMetadata(
    path: string,
    titleKey: string,
    descriptionKey: string,
    query: ListingQuery,
) {
    const t = await getTranslations()
    return listingMetadata(
        path,
        (await getLocale()) as SiteLocale,
        t(titleKey),
        t(descriptionKey),
        query,
    )
}
