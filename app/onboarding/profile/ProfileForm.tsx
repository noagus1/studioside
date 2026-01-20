'use client'

/**
 * Profile Form Component
 * 
 * Client component for entering full name during onboarding.
 * Uses the existing updateUserProfile action.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateUserProfile } from '@/actions/updateUserProfile'

export default function ProfileForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate full name
    if (!fullName.trim()) {
      setError('Please enter your full name')
      setIsLoading(false)
      return
    }

    try {
      const result = await updateUserProfile({
        full_name: fullName.trim(),
      })

      if ('error' in result) {
        setError(result.message)
        setIsLoading(false)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
          Your Name
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="John Doe"
          disabled={isLoading}
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-1">
          How your name will appear to others.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading || !fullName.trim()}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Saving...' : 'Continue'}
      </button>
    </form>
  )
}
