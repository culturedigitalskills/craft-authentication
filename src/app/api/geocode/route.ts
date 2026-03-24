import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat')
  const lng = request.nextUrl.searchParams.get('lng')

  if (!lat || !lng) return NextResponse.json({ city: null })

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { 
        headers: { 
          'Accept-Language': 'en', 
          'User-Agent': 'MyApp/1.0 (karina.r.e@gmail.com)' } 
      }
    )
    const text = await res.text()
    const data = JSON.parse(text)

    const cityName = data.address?.city ?? data.address?.town ?? data.address?.village ?? data.address?.county ?? 'Unknown'
    const country = data.address?.country ?? ''
    console.log("country ",country)

    return NextResponse.json({ city: `${cityName}, ${country}` })
  } catch (error) {
    console.error('Geocode error:', error)
    return NextResponse.json({ city: null })
  }
}