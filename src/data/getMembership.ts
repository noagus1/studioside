'use server'

/**
 * Get Membership
 *
 * Returns the current user's membership for the active studio
 * (as determined by the current_studio_id cookie).
 *
 * ⚠️ Server-only function. Must be called from Server Actions or Route Handlers.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import type { Membership } from '@/types/membership'

/**
 * Gets the current user's membership for the active studio.
 *
 * @returns Membership object if found, null if no active studio or not a member
 * @throws Error if user is not authenticated
 */
export async function getMembership(): Promise<Membership | null> {
  if (typeof window !== 'undefined') {
    throw new Error('getMembership() can only be used server-side')
  }

  const studioId = await getCurrentStudioId()
  if (!studioId) {
    return null
  }

  const supabase = await getSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('studio_memberships')
    .select('*')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('row-level security')) {
      return null
    }
    throw new Error(`Failed to fetch membership: ${error.message}`)
  }

  return data as Membership
}
