'use server'

import { admin } from '@/lib/supabase/adminClient'
import type { MembershipRole } from '@/types/db'

export interface PendingInviteSummary {
  id: string
  studio_id: string
  email: string
  role: MembershipRole
  invited_by: string
  created_at: string
  expires_at: string
  studio: {
    id: string
    name: string
    slug: string
    logo_url: string | null
  }
  inviter?: {
    id: string
    full_name: string | null
    email: string | null
  }
}

export async function getPendingInvitesForEmail(
  email: string
): Promise<PendingInviteSummary[]> {
  const normalizedEmail = email.toLowerCase().trim()
  const nowIso = new Date().toISOString()

  const { data: invites, error } = await admin
    .from('studio_invitations')
    .select(
      `
      id,
      studio_id,
      email,
      role,
      invited_by,
      created_at,
      expires_at,
      studios (
        id,
        name,
        slug,
        logo_url
      )
    `
    )
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .is('accepted_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })

  if (error || !invites) {
    console.warn('Failed to fetch pending invites:', error)
    return []
  }

  const inviterIds = Array.from(
    new Set(invites.map((invite: any) => invite.invited_by).filter(Boolean))
  )

  let inviterMap = new Map<string, { id: string; full_name: string | null; email: string | null }>()
  if (inviterIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', inviterIds)

    inviterMap = new Map(
      (profiles || []).map((profile: any) => [
        profile.id,
        { id: profile.id, full_name: profile.full_name, email: profile.email },
      ])
    )
  }

  return invites
    .map((invite: any) => {
      const studio = Array.isArray(invite.studios) ? invite.studios[0] : invite.studios
      if (!studio) return null

      const inviter = inviterMap.get(invite.invited_by)
      return {
        id: invite.id,
        studio_id: invite.studio_id,
        email: invite.email,
        role: invite.role,
        invited_by: invite.invited_by,
        created_at: invite.created_at,
        expires_at: invite.expires_at,
        studio: {
          id: studio.id,
          name: studio.name,
          slug: studio.slug,
          logo_url: studio.logo_url,
        },
        inviter,
      } as PendingInviteSummary
    })
    .filter(Boolean) as PendingInviteSummary[]
}
