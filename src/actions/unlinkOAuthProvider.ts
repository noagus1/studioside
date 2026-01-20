'use server'

/**
 * Unlink OAuth Provider Server Action
 * 
 * Unlinks an OAuth provider from the current authenticated user's account.
 * Prevents unlinking if it's the only authentication method.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { admin } from '@/lib/supabase/adminClient'

export interface UnlinkOAuthProviderResult {
  success: true
}

export interface UnlinkOAuthProviderError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'VALIDATION_ERROR'
    | 'INSUFFICIENT_METHODS'
    | 'PROVIDER_NOT_FOUND'
    | 'ADMIN_ERROR'
  message: string
}

/**
 * Unlinks an OAuth provider from the current user's account.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must have at least one other authentication method
 * 
 * @param provider - OAuth provider to unlink (e.g., 'google')
 * @returns Success result or error object
 */
export async function unlinkOAuthProvider(
  provider: string
): Promise<UnlinkOAuthProviderResult | UnlinkOAuthProviderError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to unlink an OAuth provider',
    }
  }

  // Validate provider
  if (!provider || typeof provider !== 'string') {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid OAuth provider',
    }
  }

  // Get all user identities using the regular client
  try {
    const { data, error: identitiesError } = await supabase.auth.getUserIdentities()
    const identities = data?.identities

    if (identitiesError || !identities) {
      // Fallback to admin client if regular client fails
      const { data: adminUser, error: adminError } = await admin.auth.admin.getUserById(
        user.id
      )

      if (adminError || !adminUser?.user) {
        return {
          error: 'ADMIN_ERROR',
          message: 'Failed to fetch user identities',
        }
      }

      // If we can't get identities from regular client, we can't unlink using unlinkIdentity
      // This is a limitation - unlinkIdentity requires the regular client
      return {
        error: 'ADMIN_ERROR',
        message: 'Unable to fetch identities for unlinking. Please try again.',
      }
    }

    // Check if provider is linked
    const providerIdentity = identities.find((identity) => identity.provider === provider)
    if (!providerIdentity) {
      return {
        error: 'PROVIDER_NOT_FOUND',
        message: `Provider ${provider} is not linked to your account`,
      }
    }

    // Ensure user has at least one other authentication method
    if (identities.length <= 1) {
      return {
        error: 'INSUFFICIENT_METHODS',
        message: 'Cannot unlink the only authentication method. Please add another method first.',
      }
    }

    // Unlink the provider using the regular client's unlinkIdentity method
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(providerIdentity)

    if (unlinkError) {
      return {
        error: 'ADMIN_ERROR',
        message: `Failed to unlink provider: ${unlinkError.message}`,
      }
    }
  } catch (error) {
    return {
      error: 'ADMIN_ERROR',
      message: error instanceof Error ? error.message : 'Failed to unlink provider',
    }
  }

  return {
    success: true,
  }
}
