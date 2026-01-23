import { redirect } from 'next/navigation'

/**
 * Onboarding Profile Page
 * 
 * Redirects to complete-account for profile completion.
 */
export default async function OnboardingProfilePage() {
  redirect('/complete-account')
}
