'use server'

/**
 * Update Notifications Preference Server Action
 * 
 * Updates the current authenticated user's notifications preference.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'

export interface UpdateNotificationsPreferenceResult {
  success: true
}

export interface UpdateNotificationsPreferenceError {
  error: 'AUTHENTICATION_REQUIRED' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

/**
 * Updates the current authenticated user's notifications preference.
 * 
 * Requirements:
 * - User must be authenticated
 * 
 * @param enabled - Whether notifications should be enabled
 * @returns Success result or error object
 */
export async function updateNotificationsPreference(
  enabled: boolean
): Promise<UpdateNotificationsPreferenceResult | UpdateNotificationsPreferenceError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to update your notifications preference',
    }
  }

  // Validate input
  if (typeof enabled !== 'boolean') {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid notifications preference value',
    }
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ notifications_enabled: enabled })
    .eq('id', user.id)

  if (updateError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to update notifications preference: ${updateError.message}`,
    }
  }

  return {
    success: true,
  }
}
