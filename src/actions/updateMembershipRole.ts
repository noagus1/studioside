'use server'

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import { admin } from '@/lib/supabase/adminClient'
import type { MembershipRole } from '@/types/db'
import { canChangeMemberRole } from '@/lib/memberships/rules'

export interface UpdateMembershipRoleResult {
  success: true
}

export interface UpdateMembershipRoleError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'MEMBERSHIP_NOT_FOUND'
    | 'CANNOT_CHANGE_OWNER'
    | 'DATABASE_ERROR'
  message: string
}

/**
 * Update a member's role within the current studio.
 * Only owners/admins may change roles; owner rows are immutable here.
 */
export async function updateMembershipRole(
  membershipId: string,
  role: MembershipRole
): Promise<UpdateMembershipRoleResult | UpdateMembershipRoleError> {
  if (!membershipId || !role) {
    return { error: 'DATABASE_ERROR', message: 'Membership ID and role are required' }
  }

  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'AUTHENTICATION_REQUIRED', message: 'You must be logged in to update a role' }
  }

  const studioId = await getCurrentStudioId()
  if (!studioId) {
    return { error: 'NO_STUDIO', message: 'No studio selected' }
  }

  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
  } catch (error) {
    console.warn('Failed to set current_studio_id:', error)
  }

  const { data: membership, error: membershipError } = await supabase
    .from('studio_memberships')
    .select('role, status')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    if (membershipError.code === 'PGRST116' || membershipError.message.includes('row-level security')) {
      return { error: 'NOT_A_MEMBER', message: 'You are not a member of this studio' }
    }
    return { error: 'DATABASE_ERROR', message: `Failed to verify membership: ${membershipError.message}` }
  }

  if (!membership) {
    return { error: 'NOT_A_MEMBER', message: 'You are not a member of this studio' }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'INSUFFICIENT_PERMISSIONS', message: 'Only owners and managers can change roles' }
  }

  const { data: targetMembership, error: targetError } = await admin
    .from('studio_memberships')
    .select('id, studio_id, role, status, user_id')
    .eq('id', membershipId)
    .maybeSingle()

  if (targetError) {
    if (targetError.code === 'PGRST116' || targetError.message.includes('row-level security')) {
      return { error: 'MEMBERSHIP_NOT_FOUND', message: 'Membership not found' }
    }
    return { error: 'DATABASE_ERROR', message: `Failed to load membership: ${targetError.message}` }
  }

  if (!targetMembership || targetMembership.studio_id !== studioId) {
    return { error: 'MEMBERSHIP_NOT_FOUND', message: 'Membership not found in this studio' }
  }

  if (targetMembership.status !== 'active') {
    return { error: 'MEMBERSHIP_NOT_FOUND', message: 'Membership is not active' }
  }

  const decision = canChangeMemberRole({
    actorRole: membership.role as MembershipRole,
    targetRole: targetMembership.role as MembershipRole,
    targetIsSelf: targetMembership.user_id === user.id,
    nextRole: role,
  })

  if (!decision.allowed) {
    if (decision.reason === 'target-owner') {
      return { error: 'CANNOT_CHANGE_OWNER', message: 'Owner role cannot be changed here' }
    }
    return { error: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to change this role' }
  }

  const { error: updateError } = await admin
    .from('studio_memberships')
    .update({ role })
    .eq('id', membershipId)

  if (updateError) {
    return { error: 'DATABASE_ERROR', message: `Failed to update role: ${updateError.message}` }
  }

  return { success: true }
}
