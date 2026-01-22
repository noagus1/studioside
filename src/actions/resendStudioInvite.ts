'use server'

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import { admin } from '@/lib/supabase/adminClient'
import { generateToken } from '@/lib/utils/generateToken'
import { addDays, toISOString } from '@/lib/utils/date'
import type { Invitation } from '@/types/invite'
import { hashToken } from '@/lib/utils/hashToken'

export interface ResendStudioInviteResult {
  success: true
  invitation: Invitation
  inviteUrl: string
}

export interface ResendStudioInviteError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'INVITE_NOT_FOUND'
    | 'INVALID_INVITE_STATE'
    | 'DATABASE_ERROR'
  message: string
}

/**
 * Resend a pending (or previously revoked) studio invitation.
 * Generates a new token and extends the expiration.
 */
export async function resendStudioInvite(
  inviteId: string,
  expiresInDays: number = 7
): Promise<ResendStudioInviteResult | ResendStudioInviteError> {
  if (!inviteId) {
    return { error: 'INVITE_NOT_FOUND', message: 'Invite ID is required' }
  }

  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'AUTHENTICATION_REQUIRED', message: 'You must be logged in to resend an invitation' }
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
    .from('studio_users')
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
    return { error: 'INSUFFICIENT_PERMISSIONS', message: 'Only owners and managers can resend invitations' }
  }

  const { data: invite, error: inviteError } = await admin
    .from('studio_invitations')
    .select('*')
    .eq('id', inviteId)
    .maybeSingle()

  if (inviteError) {
    return { error: 'DATABASE_ERROR', message: `Failed to load invitation: ${inviteError.message}` }
  }

  if (!invite || invite.studio_id !== studioId) {
    return { error: 'INVITE_NOT_FOUND', message: 'Invitation not found' }
  }

  if (invite.status === 'accepted') {
    return { error: 'INVALID_INVITE_STATE', message: 'This invitation has already been accepted' }
  }

  const token = generateToken(32)
  const tokenHash = hashToken(token)
  const expiresAt = addDays(new Date(), expiresInDays)

  const { data: updatedInvite, error: updateError } = await admin
    .from('studio_invitations')
    .update({
      token_hash: tokenHash,
      status: 'pending',
      accepted_at: null,
      expires_at: toISOString(expiresAt),
      invited_by: user.id,
    })
    .eq('id', inviteId)
    .select()
    .single()

  if (updateError || !updatedInvite) {
    return { error: 'DATABASE_ERROR', message: `Failed to resend invitation: ${updateError?.message || 'unknown error'}` }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${appUrl.replace(/\/$/, '')}/join?token=${token}`
  const callbackUrl = `${appUrl.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(`/join?token=${token}`)}`

  const normalizedEmail = invite.email.toLowerCase().trim()
  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo: callbackUrl,
  })
  if (emailError) {
    console.warn('Failed to send invite email:', emailError)
  }

  return {
    success: true,
    invitation: updatedInvite as Invitation,
    inviteUrl,
  }
}
