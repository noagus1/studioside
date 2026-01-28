'use server'

import { geocodeAddress } from '@/lib/location/geocodeAddress'
import { resolveTimezoneFromCoordinates } from '@/lib/location/resolveTimezone'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { admin } from '@/lib/supabase/adminClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'

export type StudioAddressInput = {
  street: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
}

export interface UpdateStudioAddressInput {
  address: StudioAddressInput
  lat?: number
  lng?: number
}

export interface UpdateStudioAddressResult {
  success: true
  address: StudioAddressInput
  timezone: string
}

export type UpdateStudioAddressError = {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'PERMISSION_DENIED'
    | 'VALIDATION_ERROR'
    | 'GEOCODE_FAILED'
    | 'TIMEZONE_NOT_FOUND'
    | 'DATABASE_ERROR'
  message: string
}

const normalizeAddress = (address: StudioAddressInput): StudioAddressInput => ({
  street: address.street?.trim() || null,
  city: address.city?.trim() || null,
  state: address.state?.trim() || null,
  postal_code: address.postal_code?.trim() || null,
  country: address.country?.trim() || null,
})

export async function updateStudioAddress(
  input: UpdateStudioAddressInput
): Promise<UpdateStudioAddressResult | UpdateStudioAddressError> {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to update studio settings',
    }
  }

  const studioId = await getCurrentStudioId()
  if (!studioId) {
    return {
      error: 'NO_STUDIO',
      message: 'No studio selected',
    }
  }

  const { data: membership, error: membershipError } = await admin
    .from('studio_users')
    .select('role, status')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError || !membership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return {
      error: 'PERMISSION_DENIED',
      message: 'Only owners and managers can update studio settings',
    }
  }

  const normalizedAddress = normalizeAddress(input.address)
  const hasAddress = Object.values(normalizedAddress).some(Boolean)

  if (!hasAddress) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Address is required',
    }
  }

  const addressLine = [
    normalizedAddress.street,
    normalizedAddress.city,
    normalizedAddress.state,
    normalizedAddress.postal_code,
    normalizedAddress.country,
  ]
    .filter(Boolean)
    .join(', ')

  let latitude: number | null = Number.isFinite(input.lat ?? NaN) ? input.lat ?? null : null
  let longitude: number | null = Number.isFinite(input.lng ?? NaN) ? input.lng ?? null : null

  if (latitude === null || longitude === null) {
    const geocoded = await geocodeAddress(addressLine)
    if (!geocoded) {
      return {
        error: 'GEOCODE_FAILED',
        message: 'Unable to locate that address',
      }
    }
    latitude = geocoded.lat
    longitude = geocoded.lng
  }

  const timezone = resolveTimezoneFromCoordinates(latitude, longitude)
  if (!timezone) {
    return {
      error: 'TIMEZONE_NOT_FOUND',
      message: 'Unable to determine timezone',
    }
  }

  const { error: updateError } = await admin
    .from('studios')
    .update({
      ...normalizedAddress,
      timezone,
      last_updated_by: user.id,
    })
    .eq('id', studioId)

  if (updateError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to update studio: ${updateError.message}`,
    }
  }

  return {
    success: true,
    address: normalizedAddress,
    timezone,
  }
}
