'use server'

/**
 * Revoke Studio Invite Server Action
 * 
 * Revokes/deletes a studio invitation.
 * Only owner/admin can revoke invites.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import { admin } from '@/lib/supabase/adminClient'

export interface RevokeStudioInviteResult {
  success: true
}

export interface RevokeStudioInviteError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'INVITE_NOT_FOUND'
    | 'DATABASE_ERROR'
  message: string
}

/**
 * Revokes a studio invitation by deleting it.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be owner or admin
 * - Invite must exist and belong to the current studio
 * 
 * @param inviteId - The ID of the invitation to revoke
 * @returns Success result or error object
 */
export async function revokeStudioInvite(
  inviteId: string
): Promise<RevokeStudioInviteResult | RevokeStudioInviteError> {
  // Validate inviteId
  if (!inviteId) {
    return {
      error: 'DATABASE_ERROR',
      message: 'Invite ID is required',
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
      message: 'You must be logged in to revoke an invitation',
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

  // Verify user is a member of the studio and has permission (owner/admin)
  const { data: membership, error: membershipError } = await supabase
    .from('studio_users')
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

  // Enforce that only owner/admin can revoke invites
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return {
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'Only owners and managers can revoke invitations',
    }
  }

  // Verify the invite exists and belongs to the current studio
  const { data: invite, error: inviteCheckError } = await admin
    .from('studio_invitations')
    .select('id, studio_id, status')
    .eq('id', inviteId)
    .maybeSingle()

  if (inviteCheckError) {
    // If error is "not found" (PGRST116) or RLS violation, invite doesn't exist or not accessible
    if (inviteCheckError.code === 'PGRST116' || inviteCheckError.message.includes('row-level security')) {
      return {
        error: 'INVITE_NOT_FOUND',
        message: 'Invitation not found',
      }
    }
    // Other errors (network, database, etc.)
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to verify invitation: ${inviteCheckError.message}`,
    }
  }

  if (!invite) {
    return {
      error: 'INVITE_NOT_FOUND',
      message: 'Invitation not found',
    }
  }

  if (invite.studio_id !== studioId) {
    return {
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'You do not have permission to revoke this invitation',
    }
  }

  if (invite.status !== 'pending') {
    return {
      error: 'INVITE_NOT_FOUND',
      message: 'Invitation is not pending or has already been processed',
    }
  }

  // Soft-revoke the invitation
  const { error: revokeError } = await admin
    .from('studio_invitations')
    .update({ status: 'revoked' })
    .eq('id', inviteId)

  if (revokeError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to revoke invitation: ${revokeError.message}`,
    }
  }

  return {
    success: true,
  }
}

