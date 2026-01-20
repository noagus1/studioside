/**
 * Stripe Client
 * 
 * Singleton Stripe client instance for server-side operations.
 * 
 * ⚠️ NEVER expose this client or secret keys to client components.
 */

import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

/**
 * Stripe client instance.
 * 
 * Uses the latest recommended API version.
 * Configured for server-side use only.
 * 
 * Note: Will be null if STRIPE_SECRET_KEY is not set (e.g., during build).
 * Functions using this should check for null and return appropriate errors.
 */
export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  : (null as any) // Will throw at runtime if used without key

