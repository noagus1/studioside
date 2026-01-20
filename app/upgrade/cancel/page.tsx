import Link from 'next/link'

/**
 * Cancel Page
 * 
 * Shown when user cancels Stripe Checkout.
 */

export default function CancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div>
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Payment Canceled</h1>
          <p className="text-gray-600 mt-2">
            Your payment was canceled. No charges were made.
          </p>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="text-sm text-gray-600 mb-4">
            You can return to the upgrade page to try again, or continue using Studioside
            with limited features.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/upgrade"
            className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Try Again
          </Link>
          <Link
            href="/dashboard"
            className="block w-full text-center text-blue-600 hover:underline text-sm"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

