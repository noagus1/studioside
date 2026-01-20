/**
 * Get Current Studio
 * 
 * Returns the full studio object for the currently active studio
 * (as determined by the current_studio_id cookie).
 * 
 * ⚠️ Server-only function. Must be called from Server Actions or Route Handlers.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
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

  // Ensure RLS context is explicitly set before querying
  // This is critical for RLS policies that depend on current_studio_id()
  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
  } catch (error) {
    // Log but don't fail - RLS context may already be set by getSupabaseClient()
    // However, explicitly setting it ensures it's available for the query
    console.warn('Failed to set current_studio_id in session (getCurrentStudio):', error)
  }

  // Query the studio
  // RLS will ensure:
  // 1. studio_id matches current_studio_id()
  // 2. user is a member of the studio
  const { data, error } = await supabase
    .from('studios')
    .select('*')
    .eq('id', studioId)
    .maybeSingle()

  if (error) {
    // If error is "not found" or RLS violation, return null
    if (error.code === 'PGRST116' || error.message.includes('row-level security')) {
      return null
    }
    throw new Error(`Failed to fetch current studio: ${error.message}`)
  }

  return data as Studio
}

