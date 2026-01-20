'use server'

/**
 * Generate a Supabase magic link for an existing user without sending an email.
 * We use the admin client to create the link and return the action_link so the client
 * can navigate directly, establishing a session without email delivery.
 */

import { admin } from '@/lib/supabase/adminClient'

export interface CreateMagicLinkResult {
  success: true
  actionLink: string
}

export interface CreateMagicLinkError {
  error: 'VALIDATION_ERROR' | 'GENERATION_ERROR'
  message: string
}

export async function createMagicLinkForExistingUser(
  email: string,
  redirectTo: string
): Promise<CreateMagicLinkResult | CreateMagicLinkError> {
  const normalizedEmail = email?.toLowerCase().trim()

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'A valid email address is required',
    }
  }

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo,
      },
    })

    const actionLink = data?.properties?.action_link

    if (error || !actionLink) {
      return {
        error: 'GENERATION_ERROR',
        message: error?.message || 'Failed to generate magic link',
      }
    }

    return {
      success: true,
      actionLink,
    }
  } catch (err) {
    return {
      error: 'GENERATION_ERROR',
      message: err instanceof Error ? err.message : 'Failed to generate magic link',
    }
  }
}
