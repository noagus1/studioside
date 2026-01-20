'use client'

/**
 * Accept Invite Form
 * 
 * Client component form for accepting invitations.
 * The server action handles redirect, so we just need to handle loading/error states.
 */

import { useState } from 'react'
import { acceptInvite } from '@/actions/acceptInvite'

interface AcceptInviteFormProps {
  token: string
}

export default function AcceptInviteForm({ token }: AcceptInviteFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      // acceptInvite will redirect to /dashboard on success
      await acceptInvite(token)
      // If we get here, there was an error (redirect throws)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation'
      
      // Check for specific error types to provide better messaging
      if (errorMessage.includes('already been accepted')) {
        setError('This invitation has already been used. If you need access, please request a new invitation.')
      } else if (errorMessage.includes('expired')) {
        setError('This invitation has expired. Please contact the studio owner to request a new invitation.')
      } else if (errorMessage.includes('not found') || errorMessage.includes('invalid')) {
        setError('This invitation is invalid or could not be found. Please check the link and try again.')
      } else if (errorMessage.includes('logged in')) {
        setError('You must be logged in to accept an invitation. Please sign in and try again.')
      } else {
        setError(errorMessage)
      }
      
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <p className="font-semibold">Successfully joined!</p>
          <p className="text-sm mt-1">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold mb-1">Unable to accept invitation</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Joining Studio...</span>
          </>
        ) : (
          'Join Studio'
        )}
      </button>
    </form>
  )
}
