import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { requireAuth } from '@/lib/auth-guard'
import { handleValidationError } from '@/lib/validations/types'

const geocodeQuerySchema = z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
})

export async function GET(request: NextRequest) {
    const { unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        const { lat, lng } = geocodeQuerySchema.parse(
            Object.fromEntries(request.nextUrl.searchParams),
        )

        const url = new URL('https://nominatim.openstreetmap.org/reverse')
        url.searchParams.set('lat', String(lat))
        url.searchParams.set('lon', String(lng))
        url.searchParams.set('format', 'json')

        const res = await fetch(url, {
            headers: {
                'Accept-Language': 'en',
                // Nominatim's usage policy requires an identifying User-Agent.
                'User-Agent': `craft-authentication (+${process.env.AUTH_URL ?? 'http://localhost'})`,
            },
        })
        const data = await res.json()

        const cityName =
            data.address?.city ??
            data.address?.town ??
            data.address?.village ??
            data.address?.county ??
            'Unknown'
        const country = data.address?.country ?? ''

        return NextResponse.json({ city: `${cityName}, ${country}` })
    } catch (error) {
        if (error instanceof ZodError) return handleValidationError(error)
        console.error('Geocode error:', error)
        return NextResponse.json({ city: null })
    }
}
