'use server'

/**
 * Accept Invite Server Action
 * 
 * Accepts an invitation and creates a membership for the current authenticated user.
 * Deletes the invitation, sets the current_studio_id cookie, and redirects to dashboard.
 */

import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { setCurrentStudioId } from '@/lib/cookies/currentStudio'
import { getInviteByToken } from './getInviteByToken'
import { getOnboardingRedirectPath } from './getOnboardingRedirectPath'
import { admin } from '@/lib/supabase/adminClient'
import { clearInviteToken } from '@/lib/cookies/inviteToken'
import { isInviteAcceptable } from '@/lib/memberships/rules'
import { hashToken } from '@/lib/utils/hashToken'

export interface AcceptInviteResult {
  success: true
  alreadyMember?: boolean
  studioId: string
}

export interface AcceptInviteError {
  error:
    | 'INVALID_TOKEN'
    | 'AUTHENTICATION_REQUIRED'
    | 'INVITATION_NOT_FOUND'
    | 'INVITATION_EXPIRED'
    | 'INVITATION_ALREADY_ACCEPTED'
    | 'MEMBERSHIP_ERROR'
    | 'NETWORK_ERROR'
  message: string
}

/**
 * Accepts an invitation for the current authenticated user.
 * 
 * Steps:
 * 1. Validate user is authenticated
 * 2. Re-validate the invite token using getInviteByToken()
 * 3. Check if user is already a member
 * 4. Create membership if not already a member
 * 5. Delete the invitation (using admin client)
 * 6. Set current_studio_id cookie
 * 7. Redirect to dashboard
 * 
 * @param token - The invitation token to accept
 * @returns Result object or throws error (which triggers redirect)
 */
export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid invitation token')
  }

  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('You must be logged in to accept an invitation')
  }

  // Re-validate the invite token
  const inviteContext = await getInviteByToken(token)

  if (!inviteContext) {
    // Check if it's expired, accepted, or disabled by querying directly
    const tokenHash = hashToken(token)
    const { data: rawInvite } = await admin
      .from('studio_invitations')
      .select('expires_at, accepted_at, status')
      .eq('token_hash', tokenHash)
      .maybeSingle()
    const { data: rawLink } = await admin
      .from('studio_invite_links')
      .select('is_enabled')
      .eq('token_hash', tokenHash)
      .maybeSingle()
    
    if (rawInvite) {
      if (rawInvite.accepted_at) {
        throw new Error('This invitation has already been accepted')
      }
      const expiresAt = new Date(rawInvite.expires_at)
      if (expiresAt <= new Date()) {
        throw new Error('This invitation has expired')
      }
      if (rawInvite.status === 'revoked') {
        throw new Error('This invitation has been revoked')
      }
    }

    if (rawLink) {
      if (!rawLink.is_enabled) {
        throw new Error('This invite link is disabled')
      }
      // If link exists but wasn't acceptable, treat as invalid token state
    }
    throw new Error('Invitation not found or invalid')
  }

  const studioId = inviteContext.studio.id
  const targetRole = inviteContext.source === 'invitation' ? inviteContext.role : 'member'

  if (inviteContext.source === 'invitation') {
    const invitation = inviteContext.invitation
    if (!invitation) {
      throw new Error('Invitation data missing')
    }

    // Ensure invitation is still pending
    if (
      !isInviteAcceptable({
        status: invitation.status,
        expiresAt: invitation.expires_at,
        acceptedAt: invitation.accepted_at,
      })
    ) {
      throw new Error('This invitation is no longer available')
    }

    // Email must match (case-insensitive)
    const invitedEmail = invitation.email?.toLowerCase().trim()
    const userEmail = user.email?.toLowerCase().trim()
    if (invitedEmail && userEmail && invitedEmail !== userEmail) {
      throw new Error('This invitation is for a different email address')
    }
  }

  // Check if user is already a member of this studio
  // Use admin client to bypass RLS for this check too
  const { data: existingMembership } = await admin
    .from('studio_users')
    .select('id, studio_id, role, status')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .maybeSingle()

  const nowIso = new Date().toISOString()

  // Create or reactivate membership
  if (!existingMembership || existingMembership.status !== 'active') {
    const { data: upsertedMembership, error: membershipError } = await admin
      .from('studio_users')
      .upsert(
        {
          studio_id: studioId,
          user_id: user.id,
          role: targetRole,
          status: 'active',
          joined_at: nowIso,
        },
        { onConflict: 'studio_id,user_id' }
      )
      .select()
      .single()

    if (membershipError) {
      if (
        membershipError.code === '23505' ||
        membershipError.message.includes('unique')
      ) {
        console.log('Membership already exists (race condition)')
      } else {
        console.error('Failed to create membership:', membershipError)
        throw new Error(`Failed to create membership: ${membershipError.message}`)
      }
    } else if (!upsertedMembership) {
      throw new Error('Membership insert succeeded but no data returned')
    } else {
      console.log('Membership created or reactivated successfully:', upsertedMembership.id)
    }
  } else {
    console.log('User is already an active member, skipping membership creation')
  }

  if (inviteContext.source === 'invitation' && inviteContext.invitation?.id) {
    // Mark invitation as accepted so it cannot be reused
    const { error: updateError } = await admin
      .from('studio_invitations')
      .update({ accepted_at: nowIso, status: 'accepted' })
      .eq('id', inviteContext.invitation.id)

    if (updateError) {
      console.warn('Failed to set accepted_at on invitation:', updateError)
    }
  }

  // Set current studio cookie
  await setCurrentStudioId(studioId)
  await clearInviteToken()

  // Set studio ID in session for RLS
  try {
    await supabase.rpc('set_current_studio_id', {
      studio_uuid: studioId,
    })
  } catch (error) {
    console.warn('Failed to set current_studio_id in session:', error)
  }

  // Return success result (redirect happens via throw)
  const result: AcceptInviteResult = {
    success: true,
    alreadyMember: existingMembership?.status === 'active',
    studioId,
  }

  // Redirect based on onboarding status
  const redirectPath = await getOnboardingRedirectPath()
  redirect(redirectPath)
  
  // This line is never reached, but TypeScript needs it
  return result
}
