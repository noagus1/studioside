'use server'

/**
 * Link OAuth Provider Server Action
 * 
 * Returns a URL for the client to redirect to in order to link an OAuth provider.
 * The actual linking happens client-side using Supabase's linkIdentity() method.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'

export interface LinkOAuthProviderResult {
  success: true
  url: string
}

export interface LinkOAuthProviderError {
  error: 'AUTHENTICATION_REQUIRED' | 'VALIDATION_ERROR' | 'OAUTH_ERROR'
  message: string
}

/**
 * Generates an OAuth URL for linking a provider to the current user's account.
 * 
 * Requirements:
 * - User must be authenticated
 * 
 * @param provider - OAuth provider to link (e.g., 'google')
 * @param redirectTo - URL to redirect to after OAuth flow completes
 * @returns Success result with OAuth URL or error object
 */
export async function linkOAuthProvider(
  provider: 'google',
  redirectTo?: string
): Promise<LinkOAuthProviderResult | LinkOAuthProviderError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to link an OAuth provider',
    }
  }

  // Validate provider
  if (provider !== 'google') {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid OAuth provider. Only Google is supported.',
    }
  }

  // Generate redirect URL
  const defaultRedirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback?link=true`
      : '/auth/callback?link=true'

  const finalRedirectTo = redirectTo || defaultRedirectTo

  // Generate OAuth URL
  // Note: The actual linking will be handled client-side using linkIdentity()
  // This action just validates and returns a URL for the OAuth flow
  const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: finalRedirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (oauthError || !data?.url) {
    return {
      error: 'OAUTH_ERROR',
      message: oauthError?.message || 'Failed to generate OAuth URL',
    }
  }

  return {
    success: true,
    url: data.url,
  }
}
