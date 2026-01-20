'use server'

/**
 * Get User Settings Data
 * 
 * Returns user profile and authentication information for the settings page.
 * Includes OAuth detection based on user identities.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getUserProfile, type UserProfile } from '@/data/getUserProfile'
import { admin } from '@/lib/supabase/adminClient'

export interface UserSettingsData {
  profile: UserProfile
  email: string | null
  isOAuthUser: boolean
  oAuthProvider: string | null
  hasEmailPassword: boolean
  connectedProviders: string[]
}

export interface UserSettingsError {
  error: 'AUTHENTICATION_REQUIRED' | 'DATABASE_ERROR'
  message: string
}

/**
 * Gets user settings data including profile and OAuth information.
 * 
 * @returns User settings data or error object
 */
export async function getUserSettings(): Promise<UserSettingsData | UserSettingsError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view settings',
    }
  }

  // Get profile
  const profile = await getUserProfile()

  if (!profile) {
    return {
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch user profile',
    }
  }

  // Check sign-in methods
  // Use admin client to get complete identity information
  // Regular getUser() might not return all linked identities
  let allIdentities = user.identities || []
  
  try {
    // Get full user data from admin API which includes all identities
    const { data: adminUser, error: adminError } = await admin.auth.admin.getUserById(user.id)
    
    if (!adminError && adminUser?.user) {
      const adminIdentities = adminUser.user.identities || []
      // Use admin identities if they exist, otherwise fall back to regular identities
      if (adminIdentities.length > 0) {
        allIdentities = adminIdentities
      }
    }
  } catch (error) {
    // Fall back to regular identities if admin API fails
    console.warn('[getUserSettings] Failed to fetch admin user data:', error)
  }
  
  const hasEmailPassword = allIdentities.some((identity) => identity.provider === 'email') ?? false
  const isOAuthUser = allIdentities.some((identity) => identity.provider !== 'email') ?? false
  const oAuthProvider = isOAuthUser
    ? allIdentities.find((identity) => identity.provider !== 'email')?.provider ?? null
    : null
  
  // Get all connected providers - ensure we get all unique providers
  const connectedProviders = allIdentities
    .map((identity) => identity.provider)
    .filter((provider): provider is string => Boolean(provider))

  return {
    profile,
    email: user.email ?? null,
    isOAuthUser,
    oAuthProvider,
    hasEmailPassword,
    connectedProviders,
  }
}


