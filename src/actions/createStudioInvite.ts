'use server'

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { admin } from '@/lib/supabase/adminClient'
import { generateToken } from '@/lib/utils/generateToken'
import { addDays, toISOString } from '@/lib/utils/date'
import type { MembershipRole } from '@/types/db'
import type { Invitation } from '@/types/invite'
import { hashToken } from '@/lib/utils/hashToken'

export interface CreateStudioInviteResult {
  success: true
  invitation: Invitation
  inviteUrl: string
}

export interface CreateStudioInviteError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'VALIDATION_ERROR'
    | 'ALREADY_MEMBER'
    | 'DATABASE_ERROR'
  message: string
}

export async function createStudioInvite({
  email,
  role,
  studioId,
  expiresInDays = 7,
}: {
  email: string
  role: MembershipRole
  studioId: string
  expiresInDays?: number
}): Promise<CreateStudioInviteResult | CreateStudioInviteError> {
  const normalizedEmail = email?.toLowerCase().trim()
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { error: 'VALIDATION_ERROR', message: 'A valid email address is required' }
  }
  if (!studioId) {
    return { error: 'VALIDATION_ERROR', message: 'Studio ID is required' }
  }

  if (role === 'owner') {
    return { error: 'VALIDATION_ERROR', message: 'Owner role cannot be invited' }
  }

  const targetRole: MembershipRole = role === 'admin' ? 'admin' : 'member'

  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'AUTHENTICATION_REQUIRED', message: 'You must be logged in to create an invitation' }
  }

  // Best-effort set for downstream RLS consumers (admin insert bypasses RLS)
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
    return { error: 'INSUFFICIENT_PERMISSIONS', message: 'Only owners and managers can create invitations' }
  }

  // If the target user already exists and is an active member, block the invite
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingProfile?.id) {
    const { data: existingMembership } = await admin
      .from('studio_users')
      .select('id, status')
      .eq('studio_id', studioId)
      .eq('user_id', existingProfile.id)
      .maybeSingle()

    if (existingMembership?.status === 'active') {
      return { error: 'ALREADY_MEMBER', message: 'This person is already a member of the studio' }
    }
  }

  const token = generateToken(32)
  const tokenHash = hashToken(token)
  const expiresAt = addDays(new Date(), expiresInDays)
  const nowIso = new Date().toISOString()

  // If a pending invite already exists, treat this as a resend/change-role
  const { data: existingInvite, error: existingInviteError } = await admin
    .from('studio_invitations')
    .select('*')
    .eq('studio_id', studioId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingInviteError) {
    console.warn('Failed to check existing invite:', existingInviteError)
  }

  let invitation: Invitation | null = null
  let inviteToken = token

  if (existingInvite) {
    const { data: updatedInvite, error: updateError } = await admin
      .from('studio_invitations')
      .update({
        token_hash: tokenHash,
        role: targetRole,
        status: 'pending',
        accepted_at: null,
        expires_at: toISOString(expiresAt),
        invited_by: user.id,
        updated_at: nowIso,
      })
      .eq('id', existingInvite.id)
      .select()
      .single()

    if (updateError || !updatedInvite) {
      return { error: 'DATABASE_ERROR', message: `Failed to update invitation: ${updateError?.message || 'unknown error'}` }
    }

    invitation = updatedInvite as Invitation
    inviteToken = token
  } else {
    const { data: insertedInvite, error: insertError } = await admin
      .from('studio_invitations')
      .insert({
        studio_id: studioId,
        invited_by: user.id,
        email: normalizedEmail,
        token_hash: tokenHash,
        role: targetRole,
        status: 'pending',
        expires_at: toISOString(expiresAt),
      })
      .select()
      .single()

    if (insertError || !insertedInvite) {
      return { error: 'DATABASE_ERROR', message: `Failed to create invitation: ${insertError?.message || 'unknown error'}` }
    }

    invitation = insertedInvite as Invitation
    inviteToken = token
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${appUrl.replace(/\/$/, '')}/join?token=${inviteToken}`
  const callbackUrl = `${appUrl.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(`/join?token=${inviteToken}`)}`

  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo: callbackUrl,
  })
  if (emailError) {
    console.warn('Failed to send invite email:', emailError)
  }

  return { success: true, invitation: invitation as Invitation, inviteUrl }
}
