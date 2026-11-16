import { useFormatter } from 'next-intl'

export function LocalizedDate({
    value,
    format = 'date',
}: {
    value: string | number | Date
    format?: 'date' | 'monthYear' | 'dateTime' | 'time'
}) {
    const formatter = useFormatter()
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return <span>—</span>
    const options: Pick<
        Intl.DateTimeFormatOptions,
        'hour' | 'minute' | 'second' | 'day' | 'month' | 'year'
    > =
        format === 'time'
            ? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
            : format === 'monthYear'
              ? { month: 'long', year: 'numeric' }
              : format === 'dateTime'
                ? {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                  }
                : { day: 'numeric', month: 'short', year: 'numeric' }
    return (
        <time dateTime={date.toISOString()}>
            {formatter.dateTime(date, { ...options, timeZone: 'UTC' })}
        </time>
    )
}
