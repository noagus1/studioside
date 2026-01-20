/**
 * Create Checkout Session API Route
 * 
 * Handles POST requests to create Stripe Checkout sessions.
 * Matches the Stripe quickstart pattern: POST /create-checkout-session
 * 
 * Accepts form data with optional `lookup_key` parameter.
 * If no lookup_key is provided, uses STRIPE_PRICE_ID from environment.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/actions/createCheckoutSession'

export async function POST(req: NextRequest) {
  try {
    // Parse form data
    const formData = await req.formData()
    const lookupKey = formData.get('lookup_key') as string | null

    // Create checkout session using server action
    const result = await createCheckoutSession(lookupKey || undefined)

    if ('error' in result) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    // Return the checkout URL as JSON
    // The client will handle the redirect
    // For traditional form submissions, you can use NextResponse.redirect(result.url)
    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error('Failed to create checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

