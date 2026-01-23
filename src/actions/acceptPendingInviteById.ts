'use server'

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { admin } from '@/lib/supabase/adminClient'
import { acceptPendingInviteForUser } from '@/lib/auth/resolveStudioAccess'
import { setCurrentStudioId } from '@/lib/cookies/currentStudio'
import { clearInviteToken } from '@/lib/cookies/inviteToken'

export interface AcceptPendingInviteError {
  error: 'AUTHENTICATION_REQUIRED' | 'INVITE_NOT_FOUND' | 'INVITE_EXPIRED' | 'DATABASE_ERROR'
  message: string
}

export async function acceptPendingInviteById(
  inviteId: string
): Promise<{ success: true; studioId: string } | AcceptPendingInviteError> {
  if (!inviteId) {
    return { error: 'INVITE_NOT_FOUND', message: 'Invitation not found' }
  }

  const supabase = await getSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'AUTHENTICATION_REQUIRED', message: 'You must be logged in' }
  }

  const normalizedEmail = user.email?.toLowerCase().trim()
  if (!normalizedEmail) {
    return { error: 'INVITE_NOT_FOUND', message: 'Invitation not found' }
  }

  const nowIso = new Date().toISOString()
  const { data: invite, error: inviteError } = await admin
    .from('studio_invitations')
    .select('id, studio_id, role, email, invited_by, expires_at, accepted_at, status')
    .eq('id', inviteId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .is('accepted_at', null)
    .gt('expires_at', nowIso)
    .maybeSingle()

  if (inviteError) {
    return { error: 'DATABASE_ERROR', message: inviteError.message }
  }

  if (!invite) {
    return { error: 'INVITE_NOT_FOUND', message: 'Invitation not found or expired' }
  }

  try {
    await acceptPendingInviteForUser(invite, user.id)
  } catch (error) {
    return {
      error: 'DATABASE_ERROR',
      message: error instanceof Error ? error.message : 'Failed to accept invitation',
    }
  }

  await setCurrentStudioId(invite.studio_id)
  await clearInviteToken()

  try {
    await supabase.rpc('set_current_studio_id', {
      studio_uuid: invite.studio_id,
    })
  } catch (error) {
    console.warn('Failed to set current_studio_id in session:', error)
  }

  return { success: true, studioId: invite.studio_id }
}
