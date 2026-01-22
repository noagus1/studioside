'use server'

/**
 * Create a new user with email/password via admin client.
 * Intended for invite signups where we skip email verification.
 */

import { admin } from '@/lib/supabase/adminClient'

export interface CreateUserWithPasswordResult {
  success: true
  userId: string
}

export interface CreateUserWithPasswordError {
  error: 'VALIDATION_ERROR' | 'USER_EXISTS' | 'CREATION_ERROR'
  message: string
}

export async function createUserWithPassword(
  email: string,
  password: string,
  fullName?: string
): Promise<CreateUserWithPasswordResult | CreateUserWithPasswordError> {
  const normalizedEmail = email?.toLowerCase().trim()

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'A valid email address is required',
    }
  }

  if (!password || password.length < 8) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Password must be at least 8 characters',
    }
  }

  try {
    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName.trim() } : undefined,
    })

    if (error) {
      const isUserExists =
        error.message?.toLowerCase().includes('already') ||
        error.message?.toLowerCase().includes('registered')
      return {
        error: isUserExists ? 'USER_EXISTS' : 'CREATION_ERROR',
        message: error.message || 'Failed to create user',
      }
    }

    const userId = data.user?.id
    if (!userId) {
      return {
        error: 'CREATION_ERROR',
        message: 'Failed to create user',
      }
    }

    return { success: true, userId }
  } catch (err) {
    return {
      error: 'CREATION_ERROR',
      message: err instanceof Error ? err.message : 'Failed to create user',
    }
  }
}
