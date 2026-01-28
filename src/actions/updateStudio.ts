'use server'

/**
 * Update Studio Server Action
 * 
 * Updates the current studio's information.
 * Only owners and managers can update studio settings.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import type { UpdateStudioInput } from '@/types/studio'

export interface UpdateStudioResult {
  success: true
}

export interface UpdateStudioError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'PERMISSION_DENIED' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

/**
 * Updates the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be owner or admin of the studio
 * 
 * @param input - Studio update data (name, description, logo_url)
 * @returns Success result or error object
 */
export async function updateStudio(
  input: UpdateStudioInput
): Promise<UpdateStudioResult | UpdateStudioError> {
  const supabase = await getSupabaseClient()

  // Get current user
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

  // Get current studio
  const studioId = await getCurrentStudioId()

  if (!studioId) {
    return {
      error: 'NO_STUDIO',
      message: 'No studio selected',
    }
  }

  // Set studio context for RLS
  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
  } catch (error) {
    console.warn('Failed to set current_studio_id:', error)
  }

  // Check if user is owner or admin
  const { data: membership, error: membershipError } = await supabase
    .from('studio_users')
    .select('role')
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

  // Build update object (only include fields that are provided)
  const updateData: {
    name?: string
    description?: string | null
    logo_url?: string | null
    contact_email?: string | null
    contact_phone?: string | null
    timezone?: string | null
    default_buffer_minutes?: number
    default_session_length_hours?: number
    default_overtime_rate?: number | null
    overtime_rules?: string | null
    billing_style?: string | null
    base_rate?: number | null
    last_updated_by?: string
  } = {}

  if (input.name !== undefined) {
    const trimmedName = input.name.trim()
    if (trimmedName.length === 0) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Studio name cannot be empty',
      }
    }
    updateData.name = trimmedName
  }

  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null
  }

  if (input.logo_url !== undefined) {
    updateData.logo_url = input.logo_url?.trim() || null
  }

  if (input.timezone !== undefined) {
    // Validate timezone format (basic check for IANA timezone)
    if (input.timezone && input.timezone.trim().length > 0) {
      updateData.timezone = input.timezone.trim()
    } else {
      updateData.timezone = null
    }
  }

  const sanitizeEmail = (value?: string | null) => {
    if (value === undefined) return undefined
    const trimmed = value?.trim() ?? ''
    if (!trimmed) return null
    if (trimmed.length > 254) {
      throw new Error('VALIDATION_ERROR::Email exceeds 254 characters')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      throw new Error('VALIDATION_ERROR::Invalid email format')
    }
    return trimmed
  }

  const sanitizePhone = (value?: string | null) => {
    if (value === undefined) return undefined
    const trimmed = value?.trim() ?? ''
    if (!trimmed) return null
    if (trimmed.length > 32) {
      throw new Error('VALIDATION_ERROR::Phone exceeds 32 characters')
    }
    if (!/^[\d+\-\s().]+$/.test(trimmed)) {
      throw new Error('VALIDATION_ERROR::Phone contains invalid characters')
    }
    const digitCount = (trimmed.match(/\d/g) || []).length
    if (digitCount < 7) {
      throw new Error('VALIDATION_ERROR::Phone must include at least 7 digits')
    }
    return trimmed
  }

  try {
    const contactEmail = sanitizeEmail(input.contact_email)
    const contactPhone = sanitizePhone(input.contact_phone)

    if (contactEmail !== undefined) updateData.contact_email = contactEmail
    if (contactPhone !== undefined) updateData.contact_phone = contactPhone
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('VALIDATION_ERROR::')) {
      return {
        error: 'VALIDATION_ERROR',
        message: err.message.replace('VALIDATION_ERROR::', ''),
      }
    }
    throw err
  }

  if (input.default_buffer_minutes !== undefined) {
    // Validate buffer minutes (0-60 range)
    if (input.default_buffer_minutes < 0 || input.default_buffer_minutes > 60) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Buffer minutes must be between 0 and 60',
      }
    }
    updateData.default_buffer_minutes = input.default_buffer_minutes
  }

  if (input.default_session_length_hours !== undefined) {
    // Validate session length (common values: 6, 8, 10, 12 hours)
    if (input.default_session_length_hours < 1 || input.default_session_length_hours > 24) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Session length must be between 1 and 24 hours',
      }
    }
    updateData.default_session_length_hours = input.default_session_length_hours
  }

  if (input.default_overtime_rate !== undefined) {
    // Validate overtime rate (must be non-negative)
    if (input.default_overtime_rate !== null && input.default_overtime_rate < 0) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Overtime rate must be non-negative',
      }
    }
    updateData.default_overtime_rate = input.default_overtime_rate
  }

  if (input.overtime_rules !== undefined) {
    updateData.overtime_rules = input.overtime_rules?.trim() || null
  }

  if (input.billing_style !== undefined) {
    updateData.billing_style = input.billing_style
  }

  if (input.base_rate !== undefined) {
    // Validate base rate (must be non-negative)
    if (input.base_rate !== null && input.base_rate < 0) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Base rate must be non-negative',
      }
    }
    updateData.base_rate = input.base_rate
  }

  // If no fields to update, return success
  if (Object.keys(updateData).length === 0) {
    return {
      success: true,
    }
  }

  // Always track who made the change
  updateData.last_updated_by = user.id

  // Update studio
  const { error: updateError } = await supabase
    .from('studios')
    .update(updateData)
    .eq('id', studioId)

  if (updateError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to update studio: ${updateError.message}`,
    }
  }

  return {
    success: true,
  }
}
