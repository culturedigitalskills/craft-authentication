// One tenth of a degree is about 11 km of latitude. Use the same grid before
// external lookups, storage and display, including for older precise records.
export function approximateCoordinate(value: number): number {
    return Math.round(value * 10) / 10
}

export function sharedCraftLocation(craft: {
    isSharedLocation: boolean
    latitude?: number | null
    longitude?: number | null
    place?: string | null
}) {
    return {
        latitude:
            craft.isSharedLocation && craft.latitude != null
                ? approximateCoordinate(craft.latitude)
                : null,
        longitude:
            craft.isSharedLocation && craft.longitude != null
                ? approximateCoordinate(craft.longitude)
                : null,
        place: craft.isSharedLocation ? (craft.place ?? null) : null,
    }
}
