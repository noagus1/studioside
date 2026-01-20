'use client'

/**
 * Welcome Page Client Component
 * 
 * Client component for the welcome page flow.
 * Provides options to create a studio or join via invite.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CreateStudioForm from '@/components/CreateStudioForm'
import JoinStudioInstructions from '@/components/JoinStudioInstructions'

type WelcomeStep = 'initial' | 'create' | 'join'

export default function WelcomePageClient() {
  const router = useRouter()
  const [step, setStep] = useState<WelcomeStep>('initial')

  const handleCreateClick = () => {
    setStep('create')
  }

  const handleJoinClick = () => {
    setStep('join')
  }

  const handleBackClick = () => {
    setStep('initial')
  }

  // Handle successful studio creation - redirect to dashboard
  const handleStudioCreated = () => {
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      {step === 'initial' && (
        <>
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome to Studioside ✨</h1>
            <p className="text-gray-600 mt-2">Choose how you&apos;d like to begin.</p>
          </div>

          <div className="bg-white border rounded-md p-6 space-y-4">
            <div className="space-y-3">
              <button
                onClick={handleCreateClick}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create a Studio
              </button>
              <button
                onClick={handleJoinClick}
                className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Join a Studio
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              You can always create more studios later.
            </p>
          </div>
        </>
      )}

      {step === 'create' && (
        <div className="bg-white border rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Create a Studio</h2>
            <button
              onClick={handleBackClick}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Back"
            >
              ← Back
            </button>
          </div>
          <CreateStudioForm onSuccess={handleStudioCreated} />
        </div>
      )}

      {step === 'join' && (
        <div className="bg-white border rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Join a Studio</h2>
            <button
              onClick={handleBackClick}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Back"
            >
              ← Back
            </button>
          </div>
          <JoinStudioInstructions />
        </div>
      )}
    </>
  )
}
