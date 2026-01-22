/**
 * Get User Studios
 * 
 * Returns all studios that the current authenticated user belongs to.
 * Uses RLS to ensure users can only see studios they are members of.
 * 
 * ⚠️ Server-only function. Must be called from Server Actions or Route Handlers.
 */

import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import type { MembershipRole } from '@/types/db'

/**
 * Studio membership with studio details.
 */
export interface UserStudio {
  studio_id: string
  role: MembershipRole
  studios: {
    id: string
    name: string
    slug: string
    owner_id: string
    logo_url: string | null
    description: string | null
    created_at: string
    updated_at: string
  }
}

/**
 * Gets all studios that the current authenticated user belongs to.
 * 
 * The function uses RLS policies to automatically filter memberships
 * to only those where the user is a member. Results are sorted by
 * studio creation date (newest first).
 * 
 * @returns Array of user's studio memberships with studio details
 * @throws Error if user is not authenticated
 */
export async function getUserStudios(): Promise<UserStudio[]> {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error('getUserStudios() can only be used server-side')
  }

  const supabase = await getSupabaseClient()

  // Get current user to verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Query memberships with studio details
  // RLS will automatically filter to only studios where user is a member
  const { data, error } = await supabase
    .from('studio_users')
    .select(`
      studio_id,
      role,
      studios (
        id,
        name,
        slug,
        owner_id,
        logo_url,
        description,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { foreignTable: 'studios', ascending: false })

  if (error) {
    throw new Error(`Failed to fetch user studios: ${error.message}`)
  }

  // Transform the data to match the expected shape
  // Supabase returns nested objects, so we need to flatten them
  const studios: UserStudio[] = (data || []).map((membership: any) => ({
    studio_id: membership.studio_id,
    role: membership.role,
    studios: Array.isArray(membership.studios)
      ? membership.studios[0]
      : membership.studios,
  }))

  // Filter out any entries where studio data is missing (shouldn't happen, but safety check)
  return studios.filter((s) => s.studios && s.studios.id)
}

