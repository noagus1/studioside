'use client'

/**
 * Welcome Modal Component
 * 
 * Modal that appears when user has no studios.
 * Provides options to create a studio or join via invite.
 */

import { useState } from 'react'
import CreateStudioForm from '@/components/CreateStudioForm'
import JoinStudioInstructions from './JoinStudioInstructions'

interface WelcomeModalProps {
  hasStudios: boolean
}

type ModalStep = 'initial' | 'create' | 'join'

export default function WelcomeModal({ hasStudios }: WelcomeModalProps) {
  const [step, setStep] = useState<ModalStep>('initial')

  // Don't render if user has studios
  if (hasStudios) {
    return null
  }

  const handleCreateClick = () => {
    setStep('create')
  }

  const handleJoinClick = () => {
    setStep('join')
  }

  const handleBackClick = () => {
    setStep('initial')
  }

  // Handle successful studio creation - refresh will update hasStudios prop
  // The form already calls router.refresh(), so this just ensures the modal closes
  const handleStudioCreated = () => {
    // router.refresh() is already called by the form
    // The server component will re-render and pass hasStudios=true, closing the modal
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {step === 'initial' && (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Welcome to Studioside ✨</h2>
                <p className="text-gray-600">Choose how you&apos;d like to begin.</p>
              </div>

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
            </>
          )}

          {step === 'create' && (
            <div className="space-y-4">
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
            <div className="space-y-4">
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
        </div>
      </div>
    </div>
  )
}


