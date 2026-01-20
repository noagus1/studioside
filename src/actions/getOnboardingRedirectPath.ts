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
import { getPendingInviteForEmail } from '@/actions/getPendingInviteForEmail'

/**
 * Gets the correct redirect path for the authenticated user based on onboarding status.
 * 
 * Priority:
 * 1. No full_name → `/onboarding/profile`
 * 2. Has full_name but no studios → `/join`
 * 3. Has full_name and studios → `/dashboard`
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
    
    // If no studios, redirect to join flow
    if (studios.length === 0) {
      // Try to find a pending invite by email to keep invitees out of welcome
      if (userEmail) {
        const pendingInvite = await getPendingInviteForEmail(userEmail)
        if (pendingInvite) {
          return '/join'
        }
      }

      return '/join'
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




