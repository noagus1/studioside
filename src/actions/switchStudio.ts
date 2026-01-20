'use server'

/**
 * Switch Studio Server Action
 * 
 * Switches the user's current active studio by updating the
 * current_studio_id cookie. Validates that the user is a member
 * of the target studio before switching.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { setCurrentStudioId } from '@/lib/cookies/currentStudio'
import { getUserStudios } from '@/data/getUserStudios'

export interface SwitchStudioResult {
  success: true
  studioId: string
}

export interface SwitchStudioError {
  error: 'AUTHENTICATION_REQUIRED' | 'NOT_A_MEMBER' | 'STUDIO_NOT_FOUND' | 'VALIDATION_ERROR'
  message: string
}

/**
 * Switches the user's current active studio.
 * 
 * Validates that:
 * - User is authenticated
 * - User is a member of the target studio
 * 
 * @param studioId - The studio ID to switch to
 * @param redirectPath - Optional redirect path (defaults to '/dashboard')
 * @returns Success result, or error object
 */
export async function switchStudio(
  studioId: string,
  redirectPath?: string
): Promise<SwitchStudioResult | SwitchStudioError> {
  if (!studioId) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Studio ID is required',
    }
  }

  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to switch studios',
    }
  }

  // Validate that user is a member of this studio
  // Use getUserStudios() which is RLS-safe and returns all studios user belongs to
  const userStudios = await getUserStudios()
  const isMember = userStudios.some((us) => us.studio_id === studioId)

  if (!isMember) {
    // Check if studio exists at all (for better error message)
    const { data: studio } = await supabase
      .from('studios')
      .select('id')
      .eq('id', studioId)
      .maybeSingle()

    if (!studio) {
      return {
        error: 'STUDIO_NOT_FOUND',
        message: 'Studio not found',
      }
    }

    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  // User is a member - set the current studio cookie
  await setCurrentStudioId(studioId)

  // Set studio ID in session for RLS
  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
  } catch (error) {
    // Log but don't fail - cookie is set, RLS will work on next request
    console.warn('Failed to set current_studio_id in session:', error)
  }

  // Revalidate the dashboard path to ensure fresh data with updated cookies
  // This ensures proper server-side revalidation with the new studio context
  revalidatePath('/dashboard')

  return {
    success: true,
    studioId,
  }
}

/**
 * Auto-selects a studio for the current user.
 * Prioritizes: owner > admin > member
 * 
 * This is used when a user logs in and needs a studio to be automatically selected.
 * 
 * @returns Success result, or error object
 */
export async function autoSelectStudio(): Promise<SwitchStudioResult | SwitchStudioError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to select a studio',
    }
  }

  // Get user's studios
  const userStudios = await getUserStudios()

  if (userStudios.length === 0) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'User has no studios',
    }
  }

  // Prioritize: owner > admin > member
  const ownerStudio = userStudios.find((s) => s.role === 'owner')
  const adminStudio = userStudios.find((s) => s.role === 'admin')
  const studioToSelect = ownerStudio || adminStudio || userStudios[0]
  
  const selectedStudioId = studioToSelect.studios.id
  return await switchStudio(selectedStudioId)
}

/**
 * Switches studio and redirects.
 * 
 * Convenience wrapper that redirects after switching.
 * 
 * @param studioId - The studio ID to switch to
 * @param redirectPath - Optional redirect path (defaults to '/dashboard')
 */
export async function switchStudioAndRedirect(
  studioId: string,
  redirectPath: string = '/dashboard'
) {
  const result = await switchStudio(studioId, redirectPath)

  if ('error' in result) {
    throw new Error(result.message)
  }

  redirect(redirectPath)
}

