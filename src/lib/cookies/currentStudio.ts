/**
 * Current Studio Cookie Helpers
 * 
 * Utilities for managing the current_studio_id cookie.
 * 
 * ⚠️ These functions MUST only be used in Server Actions or Route Handlers.
 * ⚠️ Cookies cannot be set from Client Components in Next.js.
 */

import { cookies } from 'next/headers'
import type { UserStudio } from '@/data/getUserStudios'

const COOKIE_NAME = 'current_studio_id'

/**
 * Gets the current studio ID from cookies.
 * 
 * @returns The current studio ID, or null if not set
 */
export async function getCurrentStudioId(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    throw new Error('getCurrentStudioId() can only be used server-side')
  }

  const cookieStore = cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

/**
 * Sets the current studio ID in cookies.
 * 
 * @param studioId - The studio ID to set
 */
export async function setCurrentStudioId(studioId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    throw new Error('setCurrentStudioId() can only be used server-side')
  }

  const cookieStore = cookies()
  
  cookieStore.set(COOKIE_NAME, studioId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Cookie expires in 1 year (adjust as needed)
    maxAge: 60 * 60 * 24 * 365,
  })
}

/**
 * Clears the current studio ID cookie.
 */
export async function clearCurrentStudioId(): Promise<void> {
  if (typeof window !== 'undefined') {
    throw new Error('clearCurrentStudioId() can only be used server-side')
  }

  const cookieStore = cookies()
  cookieStore.delete(COOKIE_NAME)
}

/**
 * Validates the current studio ID against user's studios.
 * 
 * Returns the studio ID that should be used. Does NOT set cookies.
 * Use this in Server Components to determine which studio to display.
 * 
 * @param studios - Array of studios the user belongs to
 * @returns Object with:
 *   - currentStudioId: The studio ID to use (or null if no studios)
 *   - needsAutoSelect: Whether a studio needs to be auto-selected
 */
export async function validateCurrentStudio(
  studios: UserStudio[]
): Promise<{ currentStudioId: string | null; needsAutoSelect: boolean }> {
  if (typeof window !== 'undefined') {
    throw new Error('validateCurrentStudio() can only be used server-side')
  }  // If user has no studios, return null
  if (studios.length === 0) {
    return { currentStudioId: null, needsAutoSelect: false }
  }

  // Get current studio ID from cookie
  const currentStudioId = await getCurrentStudioId()

  // Validate if current studio ID exists in user's studios
  const isValid = currentStudioId !== null && 
    studios.some((us) => us.studios.id === currentStudioId)  // If valid, return it
  if (isValid) {
    return { currentStudioId, needsAutoSelect: false }
  }

  // If invalid or null, return first studio ID (needs to be set via Server Action)
  const firstStudioId = studios[0].studios.id
  return { currentStudioId: firstStudioId, needsAutoSelect: true }
}