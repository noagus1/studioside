'use server'

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import { admin } from '@/lib/supabase/adminClient'
import { generateToken } from '@/lib/utils/generateToken'
import { hashToken } from '@/lib/utils/hashToken'

export interface ToggleInviteLinkResult {
  success: true
  isEnabled: boolean
  token?: string
  inviteUrl?: string
}

export interface ToggleInviteLinkError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'DATABASE_ERROR'
  message: string
}

/**
 * Enables or disables the studio invite link. When enabling and no link exists,
 * a fresh token is generated.
 */
export async function toggleInviteLink(isEnabled: boolean): Promise<ToggleInviteLinkResult | ToggleInviteLinkError> {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'AUTHENTICATION_REQUIRED', message: 'You must be logged in to manage invite links' }
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
    return { error: 'DATABASE_ERROR', message: `Failed to verify membership: ${membershipError.message}` }
  }

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return { error: 'INSUFFICIENT_PERMISSIONS', message: 'Only owners and managers can manage invite links' }
  }

  const { data: existing, error: fetchError } = await admin
    .from('studio_invite_links')
    .select('id, token, token_hash, is_enabled')
    .eq('studio_id', studioId)
    .maybeSingle()

  if (fetchError) {
    return { error: 'DATABASE_ERROR', message: `Failed to load invite link: ${fetchError.message}` }
  }

  // If enabling and link is missing, create a fresh one
  if (isEnabled && !existing) {
    const token = generateToken(32)
    const tokenHash = hashToken(token)
    const { error: insertError } = await admin
      .from('studio_invite_links')
      .insert({
        studio_id: studioId,
        token,
        token_hash: tokenHash,
        default_role: 'member',
        is_enabled: true,
      })
    if (insertError) {
      return { error: 'DATABASE_ERROR', message: `Failed to enable invite link: ${insertError.message}` }
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${appUrl.replace(/\/$/, '')}/join?token=${token}`
    return { success: true, isEnabled: true, token, inviteUrl }
  }

  // If nothing to change, just return current state
  if (existing && existing.is_enabled === isEnabled) {
    return { success: true, isEnabled }
  }

  const { error: updateError } = await admin
    .from('studio_invite_links')
    .update({ is_enabled: isEnabled })
    .eq('studio_id', studioId)

  if (updateError) {
    return { error: 'DATABASE_ERROR', message: `Failed to update invite link: ${updateError.message}` }
  }

  return { success: true, isEnabled }
}
