/**
 * Get Active Subscription
 * 
 * Checks if a user has an active paid subscription.
 * Used to enforce the paywall for studio creation.
 * 
 * ⚠️ Server-only function. Must be called from Server Actions or Route Handlers.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import type { SubscriptionStatus } from '@/types/db'

/**
 * Subscription entity from the database.
 */
export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

/**
 * Checks if a user has an active subscription.
 * 
 * A subscription is considered active if:
 * - status = 'active'
 * - current_period_end > now()
 * 
 * This function is used by createStudio to enforce the paywall.
 * Users must have an active subscription to create new studios.
 * 
 * @param userId - The user ID to check (defaults to current authenticated user)
 * @returns Subscription object if active subscription exists, null otherwise
 * @throws Error if user is not authenticated and userId is not provided
 */
export async function getActiveSubscription(
  userId?: string
): Promise<Subscription | null> {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error('getActiveSubscription() can only be used server-side')
  }

  const supabase = await getSupabaseClient()

  // Get user ID
  let targetUserId = userId

  if (!targetUserId) {
    // Get current user if userId not provided
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    targetUserId = user.id
  }

  // Query for active subscription
  // RLS ensures users can only see their own subscriptions
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('billing_subscriptions')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('status', 'active')
    .gt('current_period_end', now)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    // If error is "not found", return null (no active subscription)
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch subscription: ${error.message}`)
  }

  return data as Subscription | null
}

