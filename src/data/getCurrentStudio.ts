/**
 * Get Current Studio
 * 
 * Returns the full studio object for the currently active studio
 * (as determined by the current_studio_id cookie).
 * 
 * ⚠️ Server-only function. Must be called from Server Actions or Route Handlers.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { admin } from '@/lib/supabase/adminClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import type { Studio } from '@/types/studio'

/**
 * Gets the current studio from the current_studio_id cookie.
 * 
 * This function:
 * 1. Reads the current_studio_id from cookies
 * 2. Queries the studios table with RLS enabled
 * 3. Returns the studio object if found, null otherwise
 * 
 * RLS policies ensure that:
 * - The studio ID matches current_studio_id()
 * - The user is a member of that studio
 * 
 * @returns Studio object if found and user has access, null otherwise
 */
export async function getCurrentStudio(): Promise<Studio | null> {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error('getCurrentStudio() can only be used server-side')
  }

  // Get studio ID from cookie
  const studioId = await getCurrentStudioId()

  if (!studioId) {
    return null
  }

  const supabase = await getSupabaseClient()

  // Get current user to verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    // Not authenticated, but return null instead of throwing
    // This allows the function to be used in contexts where auth is optional
    return null
  }

  const { data: membership, error: membershipError } = await admin
    .from('studio_users')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    throw new Error(`Failed to verify membership: ${membershipError.message}`)
  }

  if (!membership) {
    return null
  }

  const { data, error } = await admin
    .from('studios')
    .select('*')
    .eq('id', studioId)
    .maybeSingle()

  if (error) {
    // If error is "not found" or RLS violation, return null
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch current studio: ${error.message}`)
  }

  return data as Studio
}

