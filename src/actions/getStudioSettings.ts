'use server'

/**
 * Get Studio Settings Server Action
 * 
 * Fetches studio data and user role for the current studio.
 * Used by client components that need studio settings data.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import { admin } from '@/lib/supabase/adminClient'
import type { Studio } from '@/types/studio'
import type { MembershipRole } from '@/types/db'

export interface StudioSettingsData {
  studio: Studio
  userRole: MembershipRole | null
  isOwnerOrAdmin: boolean
  memberCount: number
}

export interface StudioSettingsError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

export async function getStudioSettings(): Promise<StudioSettingsData | StudioSettingsError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view studio settings',
    }
  }

  // Get current studio
  const studioId = await getCurrentStudioId()

  if (!studioId) {
    return {
      error: 'NO_STUDIO',
      message: 'No studio selected',
    }
  }

  // Set studio context for RLS
  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
  } catch (error) {
    console.warn('Failed to set current_studio_id:', error)
  }

  // Use admin client for studio + membership to avoid studios RLS blocking
  // non-owner roles. Membership is still validated against the active user.
  const [studioResult, membershipResult] = await Promise.all([
    admin
      .from('studios')
      .select('*')
      .eq('id', studioId)
      .maybeSingle(),
    // Get user's membership to check role
    // Query explicitly with both studio_id and user_id to ensure we get the correct membership
    // The UNIQUE constraint on (studio_id, user_id) ensures we get exactly one result
    admin
      .from('studio_users')
      .select('role, studio_id, user_id, status')
      .eq('studio_id', studioId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  const { data: studio, error: studioError } = studioResult
  const { data: membership, error: membershipError } = membershipResult

  if (studioError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch studio: ${studioError.message}`,
    }
  }

  if (!studio) {
    return {
      error: 'NO_STUDIO',
      message: 'Studio not found',
    }
  }

  if (membershipError) {
    console.error('[getStudioSettings] Membership query error:', {
      error: membershipError,
      studioId,
      userId: user.id,
    })
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch membership: ${membershipError.message}`,
    }
  }

  if (!membership) {
    // Debug: Check if user has any memberships at all
    const { data: allMemberships } = await supabase
      .from('studio_users')
      .select('studio_id, role, status')
      .eq('user_id', user.id)
    
    console.warn('[getStudioSettings] No membership found:', {
      studioId,
      userId: user.id,
      allMemberships: allMemberships?.map(m => ({ studio_id: m.studio_id, role: m.role })),
    })
    
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  // Verify we got the correct membership
  if (membership.studio_id !== studioId || membership.user_id !== user.id) {
    console.error('[getStudioSettings] Membership mismatch:', {
      expectedStudioId: studioId,
      expectedUserId: user.id,
      actualStudioId: membership.studio_id,
      actualUserId: membership.user_id,
    })
    return {
      error: 'DATABASE_ERROR',
      message: 'Membership data mismatch',
    }
  }

  const userRole = membership.role as MembershipRole
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin'

  const { count: memberCount, error: memberCountError } = await admin
    .from('studio_users')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .eq('status', 'active')

  if (memberCountError) {
    console.warn('[getStudioSettings] Failed to count members:', {
      error: memberCountError,
      studioId,
    })
  }
  
  // Debug log for troubleshooting
  console.log('[getStudioSettings] Membership found:', {
    studioId,
    userId: user.id,
    role: userRole,
    isOwnerOrAdmin,
  })

  return {
    studio: studio as Studio,
    userRole,
    isOwnerOrAdmin,
    memberCount: typeof memberCount === 'number' ? memberCount : 0,
  }
}
