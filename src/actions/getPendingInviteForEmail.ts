'use server'

/**
 * Get the newest pending invitation for a given email.
 * Returns null if none exist (expired or accepted invites are ignored).
 */

import { admin } from '@/lib/supabase/adminClient'

export interface PendingInvite {
  studio_id: string
  created_at: string
}

export async function getPendingInviteForEmail(
  email: string | null | undefined
): Promise<PendingInvite | null> {
  const normalizedEmail = email?.toLowerCase().trim()
  if (!normalizedEmail) return null

  const nowIso = new Date().toISOString()

  const { data, error } = await admin
    .from('studio_invitations')
    .select('studio_id, created_at, expires_at, accepted_at, status')
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .is('accepted_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.warn('Failed to fetch pending invite by email:', error)
    return null
  }

  if (!data || data.length === 0) {
    return null
  }

  const invite = data[0]

  return {
    studio_id: invite.studio_id,
    created_at: invite.created_at,
  }
}




