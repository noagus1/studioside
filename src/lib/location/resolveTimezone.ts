import { find as findTimezone } from 'geo-tz'

export function resolveTimezoneFromCoordinates(lat: number, lng: number): string | null {
  const matches = findTimezone(lat, lng)
  return matches?.[0] ?? null
}
