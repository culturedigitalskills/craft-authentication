import { useFormatter, useTranslations } from 'next-intl'

export function LocalizedCount({
    kind,
    count,
}: {
    kind: 'artisanCount' | 'communityCount' | 'craftCount' | 'makerCount' | 'experienceYears'
    count: number
}) {
    const t = useTranslations('interface')
    return <>{t(kind, { count })}</>
}

export function LocalizedNumber({ value }: { value: number }) {
    const format = useFormatter()
    return <>{format.number(value)}</>
}
