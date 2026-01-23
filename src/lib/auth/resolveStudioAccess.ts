'use server'

import { redirect } from 'next/navigation'
import type { MembershipRole } from '@/types/db'
import type { UserStudio } from '@/data/getUserStudios'
import { admin } from '@/lib/supabase/adminClient'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getUserStudios } from '@/data/getUserStudios'
import { validateCurrentStudio } from '@/lib/cookies/currentStudio'

export type ResolveStudioAccessResult =
  | { state: 'ready' }
  | { state: 'no-studios' }
  | { state: 'needs-picker'; studios: UserStudio[] }

type PendingInviteRow = {
  id: string
  studio_id: string
  role: MembershipRole
  email: string
  invited_by: string
  expires_at: string
  accepted_at: string | null
  status: 'pending' | 'accepted' | 'revoked'
}

async function fetchPendingInvitesByEmail(email: string): Promise<PendingInviteRow[]> {
  const nowIso = new Date().toISOString()
  const { data, error } = await admin
    .from('studio_invitations')
    .select(
      'id, studio_id, role, email, invited_by, expires_at, accepted_at, status'
    )
    .eq('email', email)
    .eq('status', 'pending')
    .is('accepted_at', null)
    .gt('expires_at', nowIso)

  if (error || !data) {
    console.warn('Failed to fetch pending invites:', error)
    return []
  }

  return data as PendingInviteRow[]
}

export async function acceptPendingInviteForUser(
  invite: PendingInviteRow,
  userId: string
): Promise<{ studioId: string; alreadyMember?: boolean }> {
  const nowIso = new Date().toISOString()

  const { data: existingMembership } = await admin
    .from('studio_users')
    .select('id, studio_id, role, status')
    .eq('studio_id', invite.studio_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existingMembership || existingMembership.status !== 'active') {
    const { error: membershipError } = await admin
      .from('studio_users')
      .upsert(
        {
          studio_id: invite.studio_id,
          user_id: userId,
          role: invite.role,
          status: 'active',
          joined_at: nowIso,
        },
        { onConflict: 'studio_id,user_id' }
      )

    if (membershipError) {
      throw new Error(`Failed to create membership: ${membershipError.message}`)
    }
  }

  const { error: inviteUpdateError } = await admin
    .from('studio_invitations')
    .update({ accepted_at: nowIso, status: 'accepted' })
    .eq('id', invite.id)

  if (inviteUpdateError) {
    console.warn('Failed to update invitation status:', inviteUpdateError)
  }

  return {
    studioId: invite.studio_id,
    alreadyMember: existingMembership?.status === 'active',
  }
}

export async function resolveStudioAccess(): Promise<ResolveStudioAccessResult> {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const normalizedEmail = user.email?.toLowerCase().trim()
  if (normalizedEmail) {
    const pendingInvites = await fetchPendingInvitesByEmail(normalizedEmail)
    if (pendingInvites.length > 1) {
      redirect('/invites')
    }

    if (pendingInvites.length === 1) {
      const invite = pendingInvites[0]
      redirect(`/api/resolve-studio?inviteId=${invite.id}`)
    }
  }

  const studios = await getUserStudios()
  if (studios.length === 0) {
    return { state: 'no-studios' }
  }

  const { currentStudioId, needsAutoSelect } = await validateCurrentStudio(studios)

  if (needsAutoSelect) {
    if (studios.length === 1 && currentStudioId) {
      redirect(`/api/resolve-studio?studioId=${currentStudioId}`)
    }

    return { state: 'needs-picker', studios }
  }

  return { state: 'ready' }
}
