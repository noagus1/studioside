'use server'

/**
 * Get Onboarding Redirect Path
 * 
 * Determines the correct redirect path based on user's onboarding status.
 * Checks both profile (full_name) and studios to determine where user should be redirected.
 * 
 * @returns The correct redirect path based on onboarding status
 */

import { getUserProfile } from '@/data/getUserProfile'
import { getUserStudios } from '@/data/getUserStudios'
import { getInviteToken } from '@/lib/cookies/inviteToken'
import { getPendingInvitesForEmail } from '@/data/getPendingInvitesForEmail'

/**
 * Gets the correct redirect path for the authenticated user based on onboarding status.
 * 
 * Priority:
 * 1. Invite token → `/join?token=...`
 * 2. Multiple pending invites → `/invites`
 * 3. Single pending invite → `/dashboard` (invite-first guard auto-accepts)
 * 4. No full_name → `/complete-account`
 * 5. Otherwise → `/dashboard`
 * 
 * @returns Redirect path string
 */
export async function getOnboardingRedirectPath(): Promise<string> {
  try {
    // If user arrived via invite, keep them in the join flow
    const inviteToken = await getInviteToken()
    if (inviteToken) {
      return `/join?token=${inviteToken}`
    }

    // Check user profile first
    const userProfile = await getUserProfile()
    const hasPassword = userProfile?.has_password ?? false
    const userEmail = userProfile?.email ?? null

    // If there are multiple pending invites, force a choice first
    if (userEmail) {
      const pendingInvites = await getPendingInvitesForEmail(userEmail)
      if (pendingInvites.length > 1) {
        return '/invites'
      }
      if (pendingInvites.length === 1) {
        return '/dashboard'
      }
    }
    
    // If no profile or missing basics, send to completion page
    // But preserve invite token if present
    if (
      !userProfile ||
      !userProfile.full_name ||
      userProfile.full_name.trim() === '' ||
      !hasPassword
    ) {
      // If there's an invite token, preserve it through complete-account
      // The token will be used after account completion
      return '/complete-account'
    }
    
    // Check if user has studios
    const studios = await getUserStudios()
    
    // If no studios, send to dashboard (empty state will guide creation)
    if (studios.length === 0) {
      return '/dashboard'
    }
    
    // User has completed onboarding, redirect to dashboard
    return '/dashboard'
  } catch (error) {
    // If there's any error, fallback to dashboard
    // This ensures users aren't stuck if there's a database issue
    console.warn('Failed to determine onboarding redirect path:', error)
    return '/dashboard'
  }
}




