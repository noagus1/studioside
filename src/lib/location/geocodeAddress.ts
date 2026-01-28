export type GeocodeResult = {
  lat: number
  lng: number
  displayName?: string
}

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim()
  if (!trimmed) return null

  const url = new URL(NOMINATIM_ENDPOINT)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('q', trimmed)

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'studioface/1.0',
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>
  const match = payload?.[0]
  if (!match?.lat || !match?.lon) return null

  const lat = Number.parseFloat(match.lat)
  const lng = Number.parseFloat(match.lon)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return {
    lat,
    lng,
    displayName: match.display_name,
  }
}
