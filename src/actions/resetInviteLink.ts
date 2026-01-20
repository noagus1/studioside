'use server'

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import { admin } from '@/lib/supabase/adminClient'
import { generateToken } from '@/lib/utils/generateToken'
import { hashToken } from '@/lib/utils/hashToken'

export interface ResetInviteLinkResult {
  success: true
  token: string
  inviteUrl: string
}

export interface ResetInviteLinkError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'DATABASE_ERROR'
  message: string
}

/**
 * Generates a new invite link token for the current studio.
 * Only owners/admins may rotate the link.
 */
export async function resetInviteLink(): Promise<ResetInviteLinkResult | ResetInviteLinkError> {
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
    return { error: 'INSUFFICIENT_PERMISSIONS', message: 'Only owners and managers can reset invite links' }
  }

  const token = generateToken(32)
  const tokenHash = hashToken(token)

  const { data: link, error: upsertError } = await admin
    .from('studio_invite_links')
    .upsert(
      {
        studio_id: studioId,
        token,
        token_hash: tokenHash,
        default_role: 'member',
        is_enabled: true,
      },
      { onConflict: 'studio_id' }
    )
    .select()
    .single()

  if (upsertError || !link) {
    return { error: 'DATABASE_ERROR', message: `Failed to reset invite link: ${upsertError?.message || 'unknown error'}` }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${appUrl.replace(/\/$/, '')}/join?token=${token}`

  return { success: true, token, inviteUrl }
}
