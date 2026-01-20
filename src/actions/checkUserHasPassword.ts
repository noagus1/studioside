'use server'

/**
 * Check User Has Password
 * 
 * Server action to check if the current authenticated user has a password set.
 * 
 * @returns Boolean indicating if user has password, or null if not authenticated
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'

export async function checkUserHasPassword(): Promise<boolean | null> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // Check has_password flag in profiles
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('has_password')
    .eq('id', user.id)
    .maybeSingle()

  // Check if error is due to missing column (migration not run yet)
  const isMissingColumnError = error && (
    error.message?.includes('does not exist') ||
    error.message?.includes('column') ||
    error.code === '42703' // PostgreSQL error code for undefined column
  )

  if (error && !isMissingColumnError) {
    // If there's a real error (not just missing column), assume no password
    return false
  }

  if (!profile || isMissingColumnError) {
    // If profile doesn't exist or column is missing, assume no password
    return false
  }

  return profile.has_password ?? false
}








