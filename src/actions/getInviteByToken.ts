'use server'

/**
 * Get Invite By Token
 * 
 * Single source of truth for validating and loading invitations.
 * Returns null if the invitation is invalid, expired, or already accepted.
 * Uses admin client to bypass RLS for token validation.
 */

import { admin } from '@/lib/supabase/adminClient'
import type { InviteContext } from '@/types/invite'
import { hashToken } from '@/lib/utils/hashToken'

/**
 * Gets and validates an invitation by token.
 * 
 * Returns null if:
 * - Token is missing or empty
 * - Invitation not found
 * - Invitation is expired
 * - Invitation is already accepted (accepted_at is not null)
 * 
 * @param token - The invitation token
 * @returns Invitation with studio data if valid, null otherwise
 */
export async function getInviteByToken(
  token: string | null | undefined
): Promise<InviteContext | null> {
  if (!token || token.trim() === '') {
    return null
  }

  const tokenHash = hashToken(token)

  // Query invitation with studio join using admin client to bypass RLS
  const { data: invitation, error } = await admin
    .from('studio_invitations')
    .select(
      `
      *,
      studios (
        id,
        name,
        slug,
        logo_url
      )
    `
    )
    .eq('token_hash', tokenHash)
    .eq('status', 'pending')
    .maybeSingle()

  // If not found or error, return null
  if (!error && invitation) {
    // Check if already accepted or revoked
    if (invitation.accepted_at || invitation.status !== 'pending') {
      return null
    }

    // Check if expired
    const expiresAt = new Date(invitation.expires_at)
    const now = new Date()

    if (expiresAt <= now) {
      return null
    }

    // Transform the nested studio data
    const studio = Array.isArray(invitation.studios)
      ? invitation.studios[0]
      : invitation.studios

    if (!studio) {
      return null
    }

    return {
      source: 'invitation',
      role: invitation.role,
      email: invitation.email,
      expires_at: invitation.expires_at,
      studio: {
        id: studio.id,
        name: studio.name,
        slug: studio.slug,
        logo_url: studio.logo_url,
      },
      invitation: {
        ...invitation,
        studio_id: invitation.studio_id,
        invited_by: invitation.invited_by,
      },
    }
  }

  // If not an email invite, check invite links (member-only)
  const { data: inviteLink, error: linkError } = await admin
    .from('studio_invite_links')
    .select(
      `
      *,
      studios (
        id,
        name,
        slug,
        logo_url
      )
    `
    )
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (linkError || !inviteLink) {
    return null
  }

  if (!inviteLink.is_enabled) {
    return null
  }

  const studio = Array.isArray(inviteLink.studios) ? inviteLink.studios[0] : inviteLink.studios

  if (!studio) {
    return null
  }

  return {
    source: 'invite_link',
    role: inviteLink.default_role || 'member',
    studio: {
      id: studio.id,
      name: studio.name,
      slug: studio.slug,
      logo_url: studio.logo_url,
    },
    invitation: undefined,
    expires_at: null,
  }
}

