'use server'

/**
 * Update User Profile Server Action
 * 
 * Updates the current authenticated user's profile information.
 * Updates full_name and avatar_url in the profiles table.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'

export interface UpdateUserProfileResult {
  success: true
}

export interface UpdateUserProfileError {
  error: 'AUTHENTICATION_REQUIRED' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

export interface UpdateUserProfileInput {
  full_name?: string | null
  avatar_url?: string | null
}

/**
 * Updates the current authenticated user's profile.
 * 
 * Requirements:
 * - User must be authenticated
 * 
 * @param input - Profile update data (full_name, avatar_url)
 * @returns Success result or error object
 */
export async function updateUserProfile(
  input: UpdateUserProfileInput
): Promise<UpdateUserProfileResult | UpdateUserProfileError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to update your profile',
    }
  }

  // Build update object (only include fields that are provided)
  const updateData: { full_name?: string | null; avatar_url?: string | null } = {}

  if (input.full_name !== undefined) {
    updateData.full_name = input.full_name?.trim() || null
  }

  if (input.avatar_url !== undefined) {
    updateData.avatar_url = input.avatar_url?.trim() || null
  }

  // If no fields to update, return success
  if (Object.keys(updateData).length === 0) {
    return {
      success: true,
    }
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (updateError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to update profile: ${updateError.message}`,
    }
  }

  return {
    success: true,
  }
}

















