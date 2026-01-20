'use server'

/**
 * Create Studio Server Action
 * 
 * Creates a new studio for the authenticated user.
 * Requires an active subscription (paywall enforcement).
 * 
 * After creation:
 * - Inserts studio into database
 * - Creates owner membership (via trigger)
 * - Sets current_studio_id cookie
 * - Redirects to dashboard
 */

import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { setCurrentStudioId } from '@/lib/cookies/currentStudio'
import { getActiveSubscription } from '@/data/getActiveSubscription'
import { generateSlug } from '@/lib/utils/slug'
import type { CreateStudioInput } from '@/types/studio'

export interface CreateStudioResult {
  success: true
  studioId: string
}

export interface CreateStudioError {
  error: 'SUBSCRIPTION_REQUIRED' | 'AUTHENTICATION_REQUIRED' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

/**
 * Creates a new studio for the current authenticated user.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must have an active subscription
 * 
 * @param input - Studio creation data (name, description, logo_url)
 * Note: slug is auto-generated from name
 * @returns Success result with studioId, or error object
 */
export async function createStudio(
  input: CreateStudioInput
): Promise<CreateStudioResult | CreateStudioError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to create a studio',
    }
  }

  // Validate input
  if (!input.name) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Studio name is required',
    }
  }

  // Check if paywall is enabled
  // Can be controlled via ENABLE_STRIPE_PAYWALL env var (defaults to true in production)
  // In development, paywall is disabled by default unless explicitly enabled
  const isDevelopment = process.env.NODE_ENV === 'development'
  const paywallEnabled = process.env.ENABLE_STRIPE_PAYWALL === 'true' || (!isDevelopment && process.env.ENABLE_STRIPE_PAYWALL !== 'false')

  if (paywallEnabled) {
    // Check for active subscription (paywall)
    const subscription = await getActiveSubscription(user.id)

    if (!subscription) {
      return {
        error: 'SUBSCRIPTION_REQUIRED',
        message: 'An active subscription is required to create a studio',
      }
    }
  }

  // Auto-generate slug from studio name (or use provided slug if given)
  let normalizedSlug: string
  
  if (input.slug) {
    // If slug is provided, validate and use it
    const slugRegex = /^[a-z0-9-_]+$/
    if (!slugRegex.test(input.slug.toLowerCase())) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Slug must contain only lowercase letters, numbers, hyphens, and underscores',
      }
    }
    normalizedSlug = input.slug.toLowerCase().trim()
    
    // Check if provided slug already exists
    const { data: existing } = await supabase
      .from('studios')
      .select('id')
      .eq('slug', normalizedSlug)
      .maybeSingle()
    
    if (existing) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'A studio with this slug already exists',
      }
    }
  } else {
    // Auto-generate slug from studio name
    const baseSlug = generateSlug(input.name.trim())
    
    // Check if slug already exists and append number if needed
    normalizedSlug = baseSlug
    let counter = 1
    
      // Check for existing slug (up to 10 attempts to find unique slug)
      while (counter <= 10) {
        const { data: existing } = await supabase
          .from('studios')
          .select('id')
          .eq('slug', normalizedSlug)
          .maybeSingle()
      
      if (!existing) {
        // Slug is unique, use it
        break
      }
      
      // Slug exists, try with number suffix
      normalizedSlug = `${baseSlug}-${counter}`
      counter++
    }
    
    // If we couldn't find a unique slug after 10 attempts, use timestamp suffix
    if (counter > 10) {
      normalizedSlug = `${baseSlug}-${Date.now()}`
    }
  }

  // Insert studio
  // The trigger will automatically create the owner membership
  const { data: studio, error: insertError } = await supabase
    .from('studios')
    .insert({
      name: input.name.trim(),
      slug: normalizedSlug,
      owner_id: user.id,
      description: input.description?.trim() || null,
      logo_url: input.logo_url || null,
    })
    .select()
    .single()

  if (insertError) {
    // Check if it's a unique constraint violation (duplicate slug)
    if (insertError.code === '23505' || insertError.message.includes('unique')) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'A studio with this slug already exists',
      }
    }

    return {
      error: 'DATABASE_ERROR',
      message: `Failed to create studio: ${insertError.message}`,
    }
  }

  if (!studio) {
    return {
      error: 'DATABASE_ERROR',
      message: 'Studio was created but could not be retrieved',
    }
  }

  // Set current studio cookie
  await setCurrentStudioId(studio.id)

  // Set studio ID in session for RLS
  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studio.id })
  } catch (error) {
    // Log but don't fail - cookie is set, RLS will work on next request
    console.warn('Failed to set current_studio_id in session:', error)
  }

  // Return success result
  return {
    success: true,
    studioId: studio.id,
  }
}

/**
 * Creates a studio and redirects to dashboard.
 * 
 * This is a convenience wrapper that redirects after creation.
 * Use this in form actions when you want automatic redirect.
 * 
 * @param input - Studio creation data
 */
export async function createStudioAndRedirect(input: CreateStudioInput) {
  const result = await createStudio(input)

  if ('error' in result) {
    // In a real app, you might want to handle errors differently
    // For now, we'll throw to be caught by error boundary
    throw new Error(result.message)
  }

  redirect('/dashboard')
}

