import { redirect } from 'next/navigation'
import { getUserProfile } from '@/data/getUserProfile'
import ProfileForm from './ProfileForm'

/**
 * Onboarding Profile Page
 * 
 * Asks users to enter their full name if they don't have one.
 * Redirects to dashboard if they already have a full_name.
 */
export default async function OnboardingProfilePage() {
  // Get user profile
  const userProfile = await getUserProfile()

  // If user already has a full_name, redirect to dashboard
  if (userProfile?.full_name) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">What should we call you?</h1>
        </div>

        <div className="bg-white border rounded-md p-6">
          <ProfileForm />
        </div>
      </div>
    </div>
  )
}
