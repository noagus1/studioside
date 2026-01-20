'use server'

/**
 * Create Checkout Session Server Action
 * 
 * Creates a Stripe Checkout session for subscription signup.
 * Handles customer creation if needed.
 */

import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { stripe } from '@/lib/stripe/client'
import { admin } from '@/lib/supabase/adminClient'

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// STRIPE_PRICE_ID is optional if using lookup_key instead

export interface CreateCheckoutSessionResult {
  success: true
  url: string
}

export interface CreateCheckoutSessionError {
  error: 'AUTHENTICATION_REQUIRED' | 'STRIPE_ERROR' | 'DATABASE_ERROR'
  message: string
}

/**
 * Creates a Stripe Checkout session for subscription signup.
 * 
 * Steps:
 * 1. Validate user is authenticated
 * 2. Get or create Stripe customer
 * 3. Create Checkout session
 * 4. Return session URL
 * 
 * @param lookupKey - Optional Stripe price lookup_key. Falls back to STRIPE_PRICE_ID env var.
 * @returns Checkout session URL or error object
 */
export async function createCheckoutSession(
  lookupKey?: string
): Promise<CreateCheckoutSessionResult | CreateCheckoutSessionError> {
  // Check if Stripe is configured
  if (!stripe) {
    return {
      error: 'STRIPE_ERROR',
      message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.',
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
      message: 'You must be logged in to subscribe',
    }
  }

  // Get user's email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .maybeSingle()

  const userEmail = profile?.email || user.email

  if (!userEmail) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'User email is required',
    }
  }

  // Check for existing subscription to get customer ID
  const { data: existingSubscription } = await admin
    .from('billing_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let customerId = existingSubscription?.stripe_customer_id

  // Determine which price to use
  // If lookup_key is provided, use it; otherwise fall back to STRIPE_PRICE_ID
  const priceIdentifier = lookupKey || STRIPE_PRICE_ID

  if (!priceIdentifier) {
    return {
      error: 'STRIPE_ERROR',
      message: 'No price identifier provided. Set STRIPE_PRICE_ID env var or pass lookup_key.',
    }
  }

  // Validate price exists and is accessible (helps catch test/live mode mismatches)
  try {
    const price = await stripe.prices.retrieve(priceIdentifier)
    
    // Log price info for debugging (in production, check server logs)
    console.log('Price validated:', {
      id: price.id,
      active: price.active,
      product: price.product,
      type: price.type,
    })
  } catch (priceError) {
    console.error('Price validation failed:', priceError)
    const errorMessage = priceError instanceof Error ? priceError.message : 'Unknown error'
    
    // Detect test/live mode mismatch
    const isTestKey = STRIPE_SECRET_KEY?.startsWith('sk_test_')
    const isLiveKey = STRIPE_SECRET_KEY?.startsWith('sk_live_')
    
    // Provide helpful error message
    if (errorMessage.includes('No such price')) {
      let modeHint = ''
      if (isTestKey) {
        modeHint = 'You are using a TEST mode key. Make sure the price ID is from Test mode in Stripe Dashboard.'
      } else if (isLiveKey) {
        modeHint = 'You are using a LIVE mode key. Make sure the price ID is from Live mode in Stripe Dashboard.'
      }
      
      return {
        error: 'STRIPE_ERROR',
        message: `Price ID "${priceIdentifier}" not found. ${modeHint} Please verify:
1. The price ID is correct (starts with "price_")
2. You're using the correct Stripe mode (test vs live) - check your STRIPE_SECRET_KEY
3. The price exists and is active in your Stripe account
4. If you have multiple prices, make sure you're using the right one`,
      }
    }
    
    return {
      error: 'STRIPE_ERROR',
      message: `Failed to validate price: ${errorMessage}`,
    }
  }

  // Create or update Stripe customer
  if (!customerId) {
    // Create new customer
    try {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          user_id: user.id,
        },
      })
      customerId = customer.id
    } catch (error) {
      console.error('Failed to create Stripe customer:', error)
      return {
        error: 'STRIPE_ERROR',
        message: 'Failed to create customer',
      }
    }
  } else {
    // Ensure existing customer has correct metadata
    try {
      await stripe.customers.update(customerId, {
        metadata: {
          user_id: user.id,
        },
      })
    } catch (error) {
      console.error('Failed to update customer metadata:', error)
      // Continue anyway - metadata might already be correct
    }
  }

  // Create Checkout session
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          // Stripe accepts either price ID or lookup_key here
          price: priceIdentifier,
          quantity: 1,
        },
      ],
      success_url: `${NEXT_PUBLIC_APP_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${NEXT_PUBLIC_APP_URL}/upgrade/cancel`,
      metadata: {
        user_id: user.id,
      },
    })

    if (!session.url) {
      return {
        error: 'STRIPE_ERROR',
        message: 'Failed to create checkout session URL',
      }
    }

    return {
      success: true,
      url: session.url,
    }
  } catch (error) {
    console.error('Failed to create checkout session:', error)
    return {
      error: 'STRIPE_ERROR',
      message:
        error instanceof Error ? error.message : 'Failed to create checkout session',
    }
  }
}

/**
 * Creates a checkout session and redirects to Stripe.
 * 
 * Convenience wrapper that redirects after session creation.
 */
export async function createCheckoutSessionAndRedirect() {
  const result = await createCheckoutSession()

  if ('error' in result) {
    throw new Error(result.message)
  }

  redirect(result.url)
}

