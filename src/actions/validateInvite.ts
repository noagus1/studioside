'use server'

/**
 * Validate Invite Server Action
 * 
 * Validates an invite token and returns data needed for the /join page.
 * This action can be called without authentication (for unauthenticated users).
 */

import { admin } from '@/lib/supabase/adminClient'
import type { InvitationWithStudio } from '@/types/invite'
import { hashToken } from '@/lib/utils/hashToken'

export interface ValidateInviteSuccess {
  valid: true
  invitation: InvitationWithStudio
}

export interface ValidateInviteFailure {
  valid: false
  reason: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_ACCEPTED' | 'REVOKED'
  message: string
}

export type ValidateInviteResult = ValidateInviteSuccess | ValidateInviteFailure

/**
 * Validates an invite token and returns invitation data.
 * 
 * This function:
 * - Can be called without authentication
 * - Uses admin client to bypass RLS for token validation
 * - Validates token exists, not expired, and not already accepted
 * 
 * @param token - The invitation token to validate
 * @returns Validation result with invitation data if valid, or error reason
 */
export async function validateInvite(
  token: string
): Promise<ValidateInviteResult> {
  if (!token) {
    return {
      valid: false,
      reason: 'NOT_FOUND',
      message: 'Invalid invitation token',
    }
  }

  // Use admin client to bypass RLS for token validation
  // This allows unauthenticated users to validate tokens
  const { data: inviteData, error: rpcError } = await admin.rpc(
    'validate_invite_token',
    { invite_token: token }
  )

  if (rpcError || !inviteData || inviteData.length === 0) {
    return {
      valid: false,
      reason: 'NOT_FOUND',
      message: 'Invitation not found or invalid',
    }
  }

  const invite = inviteData[0]

  // Check if already accepted (double-check)
  const { data: fullInvite, error: queryError } = await admin
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
    .eq('token_hash', hashToken(token))
    .eq('status', 'pending')
    .maybeSingle()

  if (queryError || !fullInvite) {
    return {
      valid: false,
      reason: 'NOT_FOUND',
      message: 'Invitation not found',
    }
  }

  // Check if already accepted or revoked
  if (fullInvite.status === 'revoked') {
    return {
      valid: false,
      reason: 'REVOKED',
      message: 'This invitation has been revoked',
    }
  }

  if (fullInvite.accepted_at || fullInvite.status === 'accepted') {
    return {
      valid: false,
      reason: 'ALREADY_ACCEPTED',
      message: 'This invitation has already been accepted',
    }
  }

  // Check expiration (double-check)
  const expiresAt = new Date(fullInvite.expires_at)
  const now = new Date()

  if (expiresAt <= now) {
    return {
      valid: false,
      reason: 'EXPIRED',
      message: 'This invitation has expired',
    }
  }

  // Transform the nested studio data
  const studio = Array.isArray(fullInvite.studios)
    ? fullInvite.studios[0]
    : fullInvite.studios

  if (!studio) {
    return {
      valid: false,
      reason: 'NOT_FOUND',
      message: 'Studio not found for this invitation',
    }
  }

  // Return valid invitation with studio data
  return {
    valid: true,
    invitation: {
      ...fullInvite,
      studio: {
        id: studio.id,
        name: studio.name,
        slug: studio.slug,
        logo_url: studio.logo_url,
      },
    } as InvitationWithStudio,
  }
}

