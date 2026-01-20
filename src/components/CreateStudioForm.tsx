'use client'

/**
 * Create Studio Form
 * 
 * Client component form for creating a new studio.
 * Handles subscription paywall redirect.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createStudio } from '@/actions/createStudio'
import type { CreateStudioInput } from '@/types/studio'

interface CreateStudioFormProps {
  onSuccess?: () => void
}

export default function CreateStudioForm({ onSuccess }: CreateStudioFormProps = {}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const input: CreateStudioInput = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined,
    }

    try {
      const result = await createStudio(input)

      if ('error' in result) {
        if (result.error === 'SUBSCRIPTION_REQUIRED') {
          // Redirect to upgrade page
          router.push('/upgrade')
          return
        }
        setError(result.message)
        setIsLoading(false)
        return
      }

      // Success - refresh to show new studio
      router.refresh()
      // Call onSuccess callback if provided (for modal)
      if (onSuccess) {
        onSuccess()
      } else {
        // Only redirect if not in modal context
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create studio')
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
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Studio Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="w-full border rounded px-3 py-2"
          placeholder="My Music Studio"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full border rounded px-3 py-2"
          placeholder="A brief description of your studio"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creating...' : 'Create Studio'}
      </button>
    </form>
  )
}
