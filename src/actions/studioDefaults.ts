'use server'

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'

export interface StudioDefaults {
  default_session_length_hours: number
  default_buffer_minutes: number
}

export interface GetStudioDefaultsResult {
  success: true
  defaults: StudioDefaults
}

export interface GetStudioDefaultsError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

export interface UpdateStudioDefaultsInput {
  default_session_length_hours?: number
  default_buffer_minutes?: number
}

export interface UpdateStudioDefaultsResult {
  success: true
}

export interface UpdateStudioDefaultsError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'PERMISSION_DENIED' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

const BACKEND_FALLBACK_SESSION_LENGTH_HOURS = 2

async function ensureDefaultsRow(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  studioId: string
) {
  const { data } = await supabase
    .from('studio_defaults')
    .select('studio_id')
    .eq('studio_id', studioId)
    .maybeSingle()

  if (data) return

  await supabase
    .from('studio_defaults')
    .insert({
      studio_id: studioId,
      default_session_length_hours: BACKEND_FALLBACK_SESSION_LENGTH_HOURS,
      default_buffer_minutes: 0,
    })
    .maybeSingle()
}

export async function getStudioDefaults(): Promise<GetStudioDefaultsResult | GetStudioDefaultsError> {
  const supabase = await getSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view studio defaults',
    }
  }

  const studioId = await getCurrentStudioId()
  if (!studioId) {
    return {
      error: 'NO_STUDIO',
      message: 'No studio selected',
    }
  }

  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
  } catch (error) {
    console.warn('Failed to set current_studio_id:', error)
  }

  const { data: membership } = await supabase
    .from('studio_memberships')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  // Try to ensure a row exists; ignore if RLS blocks non-admins
  await ensureDefaultsRow(supabase, studioId)

  const { data: defaults, error } = await supabase
    .from('studio_defaults')
    .select('default_session_length_hours, default_buffer_minutes')
    .eq('studio_id', studioId)
    .maybeSingle()

  if (error) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch studio defaults: ${error.message}`,
    }
  }

  return {
    success: true,
    defaults: {
      default_session_length_hours: defaults?.default_session_length_hours ?? BACKEND_FALLBACK_SESSION_LENGTH_HOURS,
      default_buffer_minutes: defaults?.default_buffer_minutes ?? 0,
    },
  }
}

export async function updateStudioDefaults(
  input: UpdateStudioDefaultsInput
): Promise<UpdateStudioDefaultsResult | UpdateStudioDefaultsError> {
  const supabase = await getSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to update studio defaults',
    }
  }

  const studioId = await getCurrentStudioId()
  if (!studioId) {
    return {
      error: 'NO_STUDIO',
      message: 'No studio selected',
    }
  }

  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
  } catch (error) {
    console.warn('Failed to set current_studio_id:', error)
  }

  const { data: membership } = await supabase
    .from('studio_memberships')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return {
      error: 'PERMISSION_DENIED',
      message: 'Only owners and managers can update studio defaults',
    }
  }

  const updateData: UpdateStudioDefaultsInput & { studio_id?: string } = {}

  if (input.default_session_length_hours !== undefined) {
    if (input.default_session_length_hours < 1 || input.default_session_length_hours > 24) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Session length must be between 1 and 24 hours',
      }
    }
    updateData.default_session_length_hours = input.default_session_length_hours
  }

  if (input.default_buffer_minutes !== undefined) {
    if (input.default_buffer_minutes < 0 || input.default_buffer_minutes > 60) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Buffer minutes must be between 0 and 60',
      }
    }
    updateData.default_buffer_minutes = input.default_buffer_minutes
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true }
  }

  // Ensure row, then update
  await ensureDefaultsRow(supabase, studioId)

  const { error: updateError } = await supabase
    .from('studio_defaults')
    .update(updateData)
    .eq('studio_id', studioId)

  if (updateError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to update studio defaults: ${updateError.message}`,
    }
  }

  return { success: true }
}
