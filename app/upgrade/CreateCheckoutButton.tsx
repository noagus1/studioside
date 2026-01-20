'use client'

/**
 * Create Checkout Button
 * 
 * Client component button that creates a Stripe checkout session.
 */

import { useState } from 'react'
import { createCheckoutSession } from '@/actions/createCheckoutSession'

export default function CreateCheckoutButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await createCheckoutSession()

      if ('error' in result) {
        setError(result.message || 'Failed to create checkout session')
        setIsLoading(false)
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = result.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout session')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Loading...' : 'Subscribe with Stripe'}
      </button>
    </div>
  )
}

