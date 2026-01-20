'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CreateStudioForm from './CreateStudioForm'

export default function OnboardingOptions() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedOption, setSelectedOption] = useState<'create' | 'invite' | null>(null)
  const [inviteToken, setInviteToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setInviteToken(text.trim())
      setError(null)
    } catch (err) {
      setError('Unable to read from clipboard. Please paste the token manually.')
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    
    const trimmedToken = inviteToken.trim()
    if (!trimmedToken) {
      setError('Please enter an invitation token')
      return
    }

    setIsValidating(true)
    
    // Validate token format (basic check - should be a reasonable length)
    if (trimmedToken.length < 10) {
      setError('Invalid token format. Please check your invitation link.')
      setIsValidating(false)
      return
    }

    // Navigate to join page with token - it will validate the token server-side
    router.push(`/join?token=${encodeURIComponent(trimmedToken)}`)
  }

  if (selectedOption === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div>
            <button
              onClick={() => setSelectedOption(null)}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold">Create a New Studio</h1>
            <p className="text-gray-600 mt-2">
              Set up your studio to get started.
            </p>
          </div>
          <CreateStudioForm />
        </div>
      </div>
    )
  }

  if (selectedOption === 'invite') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div>
            <button
              onClick={() => setSelectedOption(null)}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold">Join with Invite</h1>
            <p className="text-gray-600 mt-2">
              Enter your invitation token to join a studio.
            </p>
          </div>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                Invitation Token
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  id="token"
                  value={inviteToken}
                  onChange={(e) => {
                    setInviteToken(e.target.value)
                    setError(null)
                  }}
                  required
                  className="w-full border rounded px-3 py-2"
                  placeholder="Paste your invitation token here"
                  disabled={isValidating}
                />
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                  disabled={isValidating}
                >
                  Paste from clipboard
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You can find your invitation token in the email you received, or in the invitation link URL.
              </p>
            </div>
            <button
              type="submit"
              disabled={isValidating || !inviteToken.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Get Started</h1>
          <p className="text-gray-600 mt-2">
            Create a new studio or join an existing one with an invitation.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setSelectedOption('create')}
            className="w-full border-2 border-gray-200 rounded-lg p-6 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="font-semibold text-lg mb-1">Create a New Studio</div>
            <div className="text-sm text-gray-600">
              Start fresh with your own studio
            </div>
          </button>

          <button
            onClick={() => setSelectedOption('invite')}
            className="w-full border-2 border-gray-200 rounded-lg p-6 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="font-semibold text-lg mb-1">Join with Invite</div>
            <div className="text-sm text-gray-600">
              Accept an invitation to join an existing studio
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

