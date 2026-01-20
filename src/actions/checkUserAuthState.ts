'use server'

/**
 * Check User Auth State
 * 
 * Server action that checks if a user exists for a given email and whether they have a password set.
 * This is used in the unified auth flow to determine which screen to show.
 * 
 * @param email - Email address to check
 * @returns User auth state information
 */

import { admin } from '@/lib/supabase/adminClient'

export interface UserAuthState {
  userExists: boolean
  hasPassword: boolean
  needsMagicLink: boolean
}

export interface CheckUserAuthStateResult {
  success: true
  state: UserAuthState
}

export interface CheckUserAuthStateError {
  error: 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

export async function checkUserAuthState(
  email: string
): Promise<CheckUserAuthStateResult | CheckUserAuthStateError> {
  // Validate email
  if (!email || !email.includes('@')) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'A valid email address is required',
    }
  }

  try {
    const normalizedEmail = email.toLowerCase().trim()

    // First, check if profile exists with this email (faster than checking auth.users)
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, has_password')
      .eq('email', normalizedEmail)
      .maybeSingle()

    // Check if error is due to missing column (migration not run yet)
    const isMissingColumnError = profileError && (
      profileError.message?.includes('does not exist') ||
      profileError.message?.includes('column') ||
      profileError.code === '42703' // PostgreSQL error code for undefined column
    )

    if (profileError && profileError.code !== 'PGRST116' && !isMissingColumnError) {
      // PGRST116 is "not found" which is fine
      return {
        error: 'DATABASE_ERROR',
        message: `Failed to check user: ${profileError.message}`,
      }
    }

    // If column doesn't exist (migration not run), fall back to simpler check
    if (isMissingColumnError || (profileError && profileError.code === 'PGRST116') || !profile) {
      // Try to get user from auth to check if they exist
      try {
        const { data: authUsers } = await admin.auth.admin.listUsers()
        const user = authUsers?.users.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        )

        if (!user) {
          // User definitely doesn't exist
          return {
            success: true,
            state: {
              userExists: false,
              hasPassword: false,
              needsMagicLink: true, // New users need magic link
            },
          }
        }

        // User exists - if column doesn't exist, we can't check password status
        // So we'll assume they might have a password and let them try
        // If migration is missing, fall back to magic link flow for safety
        return {
          success: true,
          state: {
            userExists: true,
            hasPassword: false, // Safe default: assume no password if we can't check
            needsMagicLink: true,
          },
        }
      } catch (authError) {
        // If we can't check auth, assume user doesn't exist
        return {
          success: true,
          state: {
            userExists: false,
            hasPassword: false,
            needsMagicLink: true,
          },
        }
      }
    }

    // Profile exists - user exists
    const hasPassword = profile.has_password ?? false

    return {
      success: true,
      state: {
        userExists: true,
        hasPassword,
        needsMagicLink: !hasPassword, // If no password, they need magic link
      },
    }
  } catch (error) {
    return {
      error: 'DATABASE_ERROR',
      message: error instanceof Error ? error.message : 'Failed to check user auth state',
    }
  }
}








