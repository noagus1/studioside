/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for subscription lifecycle.
 * Updates billing_subscriptions table via admin client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { admin } from '@/lib/supabase/adminClient'
import Stripe from 'stripe'

/**
 * POST handler for Stripe webhooks.
 * 
 * Verifies webhook signature and processes subscription events.
 */
export async function POST(req: NextRequest) {
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Missing STRIPE_WEBHOOK_SECRET environment variable' },
      { status: 500 }
    )
  }

  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    )
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Handle subscription and invoice events
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleInvoicePayment(session)
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentIntentSucceeded(paymentIntent)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentIntentFailed(paymentIntent)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handles subscription created/updated events.
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  // Get customer to find user_id
  const customer = await stripe.customers.retrieve(subscription.customer as string)

  if (customer.deleted || !('metadata' in customer)) {
    console.error('Customer not found or deleted:', subscription.customer)
    return
  }

  const userId = customer.metadata?.user_id

  if (!userId) {
    console.error('No user_id in customer metadata:', subscription.customer)
    return
  }

  // Map Stripe status to our enum
  const statusMap: Record<string, string> = {
    active: 'active',
    canceled: 'canceled',
    past_due: 'past_due',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    unpaid: 'unpaid',
  }

  const status = statusMap[subscription.status] || 'incomplete'

  // Check if subscription row exists
  const { data: existing } = await admin
    .from('billing_subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  const subscriptionData = {
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end || false,
  }

  if (existing) {
    // Update existing subscription
    const { error } = await admin
      .from('billing_subscriptions')
      .update(subscriptionData)
      .eq('id', existing.id)

    if (error) {
      console.error('Failed to update subscription:', error)
      throw error
    }
  } else {
    // Create new subscription row
    const { error } = await admin
      .from('billing_subscriptions')
      .insert(subscriptionData)

    if (error) {
      console.error('Failed to create subscription:', error)
      throw error
    }
  }
}

/**
 * Handles subscription deleted event.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Update subscription status to canceled
  const { data: existing } = await admin
    .from('billing_subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from('billing_subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: false,
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Failed to update deleted subscription:', error)
      throw error
    }
  }
}

/**
 * Handle invoice payments created via Checkout Sessions.
 */
async function handleInvoicePayment(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoice_id
  if (!invoiceId) return

  const paidAt = new Date().toISOString()

  const { error } = await admin
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: paidAt,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: (session.payment_intent as string) ?? null,
      payment_link_url: session.url ?? null,
    })
    .eq('id', invoiceId)

  if (error) {
    console.error('Failed to mark invoice paid from checkout session:', error)
  }
}

/**
 * Handle direct PaymentIntent success for invoices.
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoice_id
  if (!invoiceId) return

  const { error } = await admin
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntent.id,
    })
    .eq('id', invoiceId)

  if (error) {
    console.error('Failed to mark invoice paid from payment_intent:', error)
  }
}

/**
 * Handle payment failure to keep invoice in sent state.
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoice_id
  if (!invoiceId) return

  const { error } = await admin
    .from('invoices')
    .update({
      status: 'sent',
      stripe_payment_intent_id: paymentIntent.id,
    })
    .eq('id', invoiceId)

  if (error) {
    console.error('Failed to update invoice after failed payment:', error)
  }
}