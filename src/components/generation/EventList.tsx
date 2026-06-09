'use client'

import { Layers } from 'lucide-react'
import { EventItem } from './EventItem'

interface EventListProps {
    events: any[]
    onShowDetail: (event: any) => void
    onCancel: (eventId: string) => void
    onRetry: (eventId: string) => void
    onRemove: (eventId: string) => void
}

export function EventList({ events, onShowDetail, onCancel, onRetry, onRemove }: EventListProps) {
    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center border border-border">
                    <Layers className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                    No generation events recorded. Specify a prompt on the left to start generating.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {events.map((event) => (
                <EventItem
                    key={event.id}
                    event={event}
                    onShowDetail={onShowDetail}
                    onCancel={onCancel}
                    onRetry={onRetry}
                    onRemove={onRemove}
                />
            ))}
        </div>
    )
}
