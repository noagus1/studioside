'use server'

/**
 * Get Current Studio ID Server Action
 * 
 * Returns the current studio ID from cookies.
 * Can be called from client components.
 */

import { getCurrentStudioId as getStudioIdFromCookie } from '@/lib/cookies/currentStudio'

export interface GetCurrentStudioIdResult {
  success: true
  studioId: string
}

export interface GetCurrentStudioIdError {
  error: 'NO_STUDIO'
  message: string
}

/**
 * Gets the current studio ID from cookies.
 * 
 * @returns Success result with studioId, or error if no studio selected
 */
export async function getCurrentStudioId(): Promise<
  GetCurrentStudioIdResult | GetCurrentStudioIdError
> {
  const studioId = await getStudioIdFromCookie()

  if (!studioId) {
    return {
      error: 'NO_STUDIO',
      message: 'No studio selected',
    }
  }

  return {
    success: true,
    studioId,
  }
}

















