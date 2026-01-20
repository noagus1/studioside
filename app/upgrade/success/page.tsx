import { Suspense } from 'react'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getActiveSubscription } from '@/data/getActiveSubscription'
import { stripe } from '@/lib/stripe/client'
import Link from 'next/link'

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>
}

/**
 * Success Page
 * 
 * Shown after successful Stripe Checkout.
 * Confirms subscription and shows next steps.
 */

async function SubscriptionConfirmation({ sessionId }: { sessionId?: string }) {
  if (!sessionId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          No session ID provided. Your subscription may still be processing.
        </p>
      </div>
    )
  }

  // Verify the checkout session with Stripe
  let sessionStatus: 'success' | 'processing' | 'error' = 'processing'
  let sessionMessage = 'Your subscription is being processed. This may take a few moments.'

  if (stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      
      if (session.payment_status === 'paid' && session.status === 'complete') {
        sessionStatus = 'success'
        sessionMessage = 'Payment confirmed! Your subscription is now active.'
      } else if (session.status === 'open') {
        sessionStatus = 'processing'
        sessionMessage = 'Payment is still processing. Please wait a moment.'
      } else {
        sessionStatus = 'error'
        sessionMessage = 'There was an issue with your payment. Please contact support.'
      }
    } catch (error) {
      console.error('Failed to retrieve Stripe session:', error)
      // Continue to check database as fallback
    }
  }

  // Check if subscription is active in database
  const subscription = await getActiveSubscription()

  if (subscription) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-800 mb-2">Subscription Confirmed!</h3>
        <p className="text-sm text-green-700">
          Your subscription is now active. You can create studios and invite team members.
        </p>
      </div>
    )
  }

  // Show status based on Stripe session verification
  if (sessionStatus === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-800 mb-2">Payment Successful!</h3>
        <p className="text-sm text-green-700">
          Your payment was confirmed. Your subscription is being activated and should be ready in a few moments.
        </p>
      </div>
    )
  }

  if (sessionStatus === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-semibold text-red-800 mb-2">Payment Issue</h3>
        <p className="text-sm text-red-700">
          {sessionMessage} If you were charged, please contact support with your session ID: {sessionId}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold text-blue-800 mb-2">Processing...</h3>
      <p className="text-sm text-blue-700">
        {sessionMessage} You can refresh this page in a moment to check your subscription status.
      </p>
    </div>
  )
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams
  const sessionId = params.session_id

  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-2xl font-bold">Please Sign In</h1>
          <p className="text-gray-600">You must be signed in to view this page.</p>
          <Link
            href="/login"
            className="inline-block text-blue-600 hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="text-gray-600 mt-2">
            Thank you for subscribing to Studioside.
          </p>
        </div>

        <Suspense fallback={<div className="text-gray-500">Loading...</div>}>
          <SubscriptionConfirmation sessionId={sessionId} />
        </Suspense>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="block w-full text-center text-blue-600 hover:underline text-sm"
          >
            Create Your First Studio
          </Link>
        </div>
      </div>
    </div>
  )
}

