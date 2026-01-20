'use server'

/**
 * Remove Studio Member Server Action
 * 
 * Removes a member from a studio by deleting their membership.
 * Only owner can remove members.
 * Owner cannot remove themselves.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import { admin } from '@/lib/supabase/adminClient'

export interface RemoveStudioMemberResult {
  success: true
}

export interface RemoveStudioMemberError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'MEMBERSHIP_NOT_FOUND'
    | 'CANNOT_REMOVE_SELF'
    | 'CANNOT_REMOVE_OWNER'
    | 'DATABASE_ERROR'
  message: string
}

/**
 * Removes a member from the studio by deleting their membership.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be owner
 * - Membership must exist and belong to the current studio
 * - Owner cannot remove themselves
 * 
 * @param memberId - The membership ID to remove
 * @returns Success result or error object
 */
export async function removeStudioMember(
  memberId: string
): Promise<RemoveStudioMemberResult | RemoveStudioMemberError> {
  // Validate memberId
  if (!memberId) {
    return {
      error: 'DATABASE_ERROR',
      message: 'Member ID is required',
    }
  }

  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to remove a member',
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

  // Verify user is a member of the studio and is owner
  const { data: membership, error: membershipError } = await supabase
    .from('studio_memberships')
    .select('role, status')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    // If error is "not found" (PGRST116) or RLS violation, user is not a member
    if (membershipError.code === 'PGRST116' || membershipError.message.includes('row-level security')) {
      return {
        error: 'NOT_A_MEMBER',
        message: 'You are not a member of this studio',
      }
    }
    // Other errors (network, database, etc.)
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to verify membership: ${membershipError.message}`,
    }
  }

  if (!membership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  // Enforce that only owner can remove members
  if (membership.role !== 'owner') {
    return {
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'Only owners can remove members',
    }
  }

  // Verify the membership exists and belongs to the current studio
  // Use admin client to bypass RLS since we've already verified the user is an owner
  // This is safe because we've verified ownership above
  const { data: targetMembership, error: membershipCheckError } = await admin
    .from('studio_memberships')
    .select('id, studio_id, user_id, role, status')
    .eq('id', memberId)
    .single()

  if (membershipCheckError) {
    // If error is "not found" (PGRST116) or RLS violation, membership doesn't exist or not accessible
    if (membershipCheckError.code === 'PGRST116' || membershipCheckError.message.includes('row-level security')) {
      return {
        error: 'MEMBERSHIP_NOT_FOUND',
        message: 'Membership not found',
      }
    }
    // Other errors (network, database, etc.)
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to verify membership: ${membershipCheckError.message}`,
    }
  }

  if (!targetMembership) {
    return {
      error: 'MEMBERSHIP_NOT_FOUND',
      message: 'Membership not found',
    }
  }

  if (targetMembership.studio_id !== studioId) {
    return {
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'You do not have permission to remove this member',
    }
  }

  // Prevent owner from removing themselves
  if (targetMembership.user_id === user.id) {
    return {
      error: 'CANNOT_REMOVE_SELF',
      message: 'You cannot remove yourself from the studio',
    }
  }

  // Prevent removing another owner (optional safety check)
  if (targetMembership.role === 'owner') {
    return {
      error: 'CANNOT_REMOVE_OWNER',
      message: 'Cannot remove another owner',
    }
  }

  if (targetMembership.status !== 'active') {
    return {
      error: 'MEMBERSHIP_NOT_FOUND',
      message: 'Membership is not active',
    }
  }

  // Soft-remove the membership to keep history
  const { error: updateError } = await admin
    .from('studio_memberships')
    .update({ status: 'removed' })
    .eq('id', memberId)

  if (updateError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to remove member: ${updateError.message}`,
    }
  }

  return {
    success: true,
  }
}

