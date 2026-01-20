/**
 * Update Password Function
 * 
 * Updates the current authenticated user's password.
 * This is a client-side function (not a server action) because it uses
 * Supabase auth which requires client-side authentication.
 * 
 * ⚠️ Client-only function. Must be called from Client Components.
 */

import { getSupabaseClient } from '@/lib/supabase/client'

export interface UpdatePasswordResult {
  success: true
}

export interface UpdatePasswordError {
  error: 'AUTHENTICATION_REQUIRED' | 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'WEAK_PASSWORD'
  message: string
}

/**
 * Updates the current authenticated user's password.
 * 
 * Requirements:
 * - User must be authenticated
 * - New password must meet Supabase's password requirements
 * 
 * @param newPassword - The new password
 * @returns Success result or error object
 */
export async function updatePassword(
  newPassword: string
): Promise<UpdatePasswordResult | UpdatePasswordError> {
  // Prevent server-side usage
  if (typeof window === 'undefined') {
    throw new Error('updatePassword() can only be used client-side')
  }

  const supabase = getSupabaseClient()

  if (!supabase) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'Supabase client is not available',
    }
  }

  // Validate password
  if (!newPassword || newPassword.length < 6) {
    return {
      error: 'WEAK_PASSWORD',
      message: 'Password must be at least 6 characters long',
    }
  }

  // Update password using Supabase auth
  const { data: { user }, error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    // Handle specific error cases
    if (updateError.message.includes('Password')) {
      return {
        error: 'WEAK_PASSWORD',
        message: updateError.message,
      }
    }

    return {
      error: 'AUTH_ERROR',
      message: `Failed to update password: ${updateError.message}`,
    }
  }

  // Set has_password flag in profiles
  if (user) {
    try {
      const { setHasPassword } = await import('@/actions/setHasPassword')
      await setHasPassword(user.id, true)
    } catch (err) {
      console.warn('Failed to set has_password flag:', err)
      // Don't fail the password update if flag update fails
    }
  }

  return {
    success: true,
  }
}

















