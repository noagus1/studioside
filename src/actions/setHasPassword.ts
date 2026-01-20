'use server'

/**
 * Set Has Password Flag
 * 
 * Server action to update the has_password flag in profiles table.
 * This is called after a user sets or updates their password.
 * 
 * @param userId - User ID (from auth.users)
 * @param hasPassword - Whether the user has a password set
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'

export async function setHasPassword(userId: string, hasPassword: boolean): Promise<void> {
  const supabase = await getSupabaseClient()

  // Update the has_password flag in profiles
  const { error } = await supabase
    .from('profiles')
    .update({ has_password: hasPassword })
    .eq('id', userId)

  if (error) {
    // Check if error is due to missing column (migration not run yet)
    const isMissingColumnError = error.message?.includes('does not exist') ||
      error.message?.includes('column') ||
      error.code === '42703' // PostgreSQL error code for undefined column

    if (isMissingColumnError) {
      console.warn('has_password column does not exist. Please run migration 038_add_has_password_flag.sql')
    } else {
      console.error('Failed to update has_password flag:', error)
    }
    // Don't throw - this is not critical for auth flow
  }
}








