'use client'

/**
 * Stripe Checkout Form Component
 * 
 * React version of the Stripe quickstart checkout form.
 * Uses the API route approach (POST to /create-checkout-session).
 * 
 * Usage:
 * <StripeCheckoutForm lookupKey="starter-plan" />
 */

import { useState } from 'react'

interface StripeCheckoutFormProps {
  /** Stripe price lookup_key. If not provided, uses STRIPE_PRICE_ID from env. */
  lookupKey?: string
  /** Button text */
  buttonText?: string
  /** Product name to display */
  productName?: string
  /** Price to display */
  price?: string
}

export default function StripeCheckoutForm({
  lookupKey,
  buttonText = 'Checkout',
  productName = 'Starter Plan',
  price = '$20.00 / month',
}: StripeCheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData()
      if (lookupKey) {
        formData.append('lookup_key', lookupKey)
      }

      // POST to the API route
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }

      // Get the checkout URL from the response and redirect
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert(error instanceof Error ? error.message : 'Failed to create checkout session')
      setIsLoading(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="product flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          width="14px"
          height="16px"
          viewBox="0 0 14 16"
          version="1.1"
          className="flex-shrink-0"
        >
          <defs />
          <g id="Flow" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
            <g id="0-Default" transform="translate(-121.000000, -40.000000)" fill="#E184DF">
              <path
                d="M127,50 L126,50 C123.238576,50 121,47.7614237 121,45 C121,42.2385763 123.238576,40 126,40 L135,40 L135,56 L133,56 L133,42 L129,42 L129,56 L127,56 L127,50 Z M127,48 L127,42 L126,42 C124.343146,42 123,43.3431458 123,45 C123,46.6568542 124.343146,48 126,48 L127,48 Z"
                id="Pilcrow"
              />
            </g>
          </g>
        </svg>
        <div className="description">
          <h3 className="font-semibold text-lg">{productName}</h3>
          <h5 className="text-gray-600">{price}</h5>
        </div>
      </div>

      <form action="/api/create-checkout-session" method="POST" onSubmit={handleSubmit}>
        {lookupKey && (
          <input type="hidden" name="lookup_key" value={lookupKey} />
        )}
        <button
          id="checkout-and-portal-button"
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : buttonText}
        </button>
      </form>
    </section>
  )
}

