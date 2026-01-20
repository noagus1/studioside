'use server'

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import { getMembership } from '@/data/getMembership'
import { createStudioInvite } from './createStudioInvite'
import type { MembershipRole } from '@/types/db'
import type { Invitation } from '@/types/invite'

export interface CreateInviteResult {
  success: true
  invitation: Invitation
  inviteUrl: string
}

export interface CreateInviteError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_CURRENT_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'VALIDATION_ERROR'
    | 'ALREADY_MEMBER'
    | 'DATABASE_ERROR'
  message: string
}

export async function createInvite(
  email: string,
  role: MembershipRole = 'member',
  expiresInDays: number = 7
): Promise<CreateInviteResult | CreateInviteError> {
  if (!email || !email.includes('@')) {
    return { error: 'VALIDATION_ERROR', message: 'A valid email address is required' }
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

  const studioId = await getCurrentStudioId()
  if (!studioId) {
    return { error: 'NO_CURRENT_STUDIO', message: 'No active studio selected' }
  }

  const membership = await getMembership()
  if (!membership) {
    return { error: 'NOT_A_MEMBER', message: 'You are not a member of the current studio' }
  }
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'INSUFFICIENT_PERMISSIONS', message: 'Only owners and managers can create invitations' }
  }

  return createStudioInvite({
    email,
    role: targetRole,
    studioId,
    expiresInDays,
  }) as Promise<CreateInviteResult | CreateInviteError>
}
