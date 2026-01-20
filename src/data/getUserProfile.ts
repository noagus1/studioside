/**
 * Get User Profile
 * 
 * Returns the current authenticated user's profile data.
 * 
 * ⚠️ Server-only function. Must be called from Server Actions or Route Handlers.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { admin } from '@/lib/supabase/adminClient'

export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  notifications_enabled: boolean
  has_password?: boolean | null
}

/**
 * Gets the current authenticated user's profile.
 * 
 * @returns UserProfile object if found, null if not authenticated
 * @throws Error if there's a database error
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error('getUserProfile() can only be used server-side')
  }

  const supabase = await getSupabaseClient()

  // Get current user to verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // Query the profile
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, notifications_enabled, has_password')
    .eq('id', user.id)
    .single()

  if (error) {
    const isMissingColumnError =
      error.message?.includes('has_password') ||
      error.message?.includes('does not exist') ||
      error.code === '42703'

    // If error is "not found", create the profile
    // Use admin client to bypass RLS since there's no INSERT policy on profiles
    if (error.code === 'PGRST116') {
      const { data: newProfile, error: insertError } = await admin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Failed to create user profile: ${insertError.message}`)
      }

      if (!newProfile) {
        throw new Error('Profile insert succeeded but no data returned')
      }

      return newProfile as UserProfile
    }

    // If has_password column is missing, retry without it
    if (isMissingColumnError) {
      const { data: fallbackProfile, error: fallbackError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, notifications_enabled')
        .eq('id', user.id)
        .single()

      if (fallbackError) {
        throw new Error(`Failed to fetch user profile: ${fallbackError.message}`)
      }

      return fallbackProfile as UserProfile
    }

    throw new Error(`Failed to fetch user profile: ${error.message}`)
  }

  return data as UserProfile
}

