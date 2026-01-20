'use server'

/**
 * Preserve Invite Token
 * 
 * Extracts invite token from a URL path and stores it in a cookie.
 * This allows tokens to be preserved through redirects.
 */

import { setInviteToken } from '@/lib/cookies/inviteToken'

/**
 * Extracts token from a URL path like "/join?token=xyz" and stores it.
 * @param path - The URL path that may contain a token
 */
export async function preserveInviteTokenFromPath(path: string): Promise<void> {
  try {
    // Extract token from path like "/join?token=xyz" or "/auth/callback?next=/join?token=xyz"
    // Handle both direct paths and nested next params
    let token: string | null = null
    
    // First try to extract from direct token param
    const directMatch = path.match(/[?&]token=([^&]+)/)
    if (directMatch) {
      token = directMatch[1]
    } else {
      // Try to extract from next param that contains /join?token=
      const nextMatch = path.match(/next=([^&]+)/)
      if (nextMatch) {
        const nextPath = decodeURIComponent(nextMatch[1])
        const nestedMatch = nextPath.match(/[?&]token=([^&]+)/)
        if (nestedMatch) {
          token = nestedMatch[1]
        }
      }
    }
    
    if (token) {
      await setInviteToken(decodeURIComponent(token))
    }
  } catch (error) {
    // Silently fail - token preservation is best-effort
    console.warn('Failed to preserve invite token from path:', error)
  }
}
