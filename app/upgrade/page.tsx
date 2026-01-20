import { Suspense } from 'react'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getActiveSubscription } from '@/data/getActiveSubscription'
import { redirect } from 'next/navigation'
import CreateCheckoutButton from './CreateCheckoutButton'
import Link from 'next/link'

async function CheckoutButtonWrapper() {
  const subscription = await getActiveSubscription()

  // Don't show checkout button if user already has active subscription
  if (subscription) {
    return null
  }

  return <CreateCheckoutButton />
}

/**
 * Upgrade Page
 * 
 * Shows subscription paywall and allows users to subscribe via Stripe.
 * Displays current subscription status if already subscribed.
 */

async function SubscriptionStatus() {
  const subscription = await getActiveSubscription()

  if (subscription) {
    const periodEnd = new Date(subscription.current_period_end)
    const isActive = subscription.status === 'active' && periodEnd > new Date()

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-800 mb-2">Active Subscription</h3>
        <p className="text-sm text-green-700">
          Your subscription is active until{' '}
          {periodEnd.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        {subscription.cancel_at_period_end && (
          <p className="text-sm text-yellow-700 mt-2">
            Your subscription will cancel at the end of the current period.
          </p>
        )}
      </div>
    )
  }

  return null
}

export default async function UpgradePage() {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if paywall is enabled (same logic as createStudio)
  const isDevelopment = process.env.NODE_ENV === 'development'
  const paywallEnabled = process.env.ENABLE_STRIPE_PAYWALL === 'true' || (!isDevelopment && process.env.ENABLE_STRIPE_PAYWALL !== 'false')

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {isDevelopment && !paywallEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-1">Development Mode</h3>
            <p className="text-sm text-yellow-700">
              Paywall disabled in development mode. You can create studios without a subscription.
            </p>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold">Subscription Required</h1>
          <p className="text-gray-600 mt-2">
            Creating a studio requires a Studioside subscription.
          </p>
        </div>

        <Suspense fallback={<div className="text-gray-500">Loading...</div>}>
          <SubscriptionStatus />
        </Suspense>

        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <p className="text-sm text-gray-600">
            With a Studioside subscription, you can:
          </p>
          <ul className="text-left space-y-2 text-sm text-gray-700">
            <li>• Create unlimited studios</li>
            <li>• Invite team members</li>
            <li>• Access all features</li>
            <li>• Priority support</li>
          </ul>
        </div>

        {paywallEnabled && (
          <Suspense
            fallback={<div className="text-gray-500">Loading...</div>}
          >
            <CheckoutButtonWrapper />
          </Suspense>
        )}

        <Link
          href="/dashboard"
          className="inline-block text-center w-full text-blue-600 hover:underline text-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
