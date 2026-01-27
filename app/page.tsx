export default async function HomePage() {
  console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
  // ... rest of your code
  return <LandingPageClient />
}

import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getOnboardingRedirectPath } from '@/actions/getOnboardingRedirectPath'
import LandingPageClient from './LandingPageClient'

/**
 * Root Landing Page
 * 
 * Server component that checks for active authentication session.
 * - If user is logged in → redirects to dashboard (or appropriate onboarding step)
 * - If user is not logged in → renders landing page client component
 * 
 * The client component handles OAuth callback tokens in URL hash.
 */

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Check for active session
  try {
    const supabase = await getSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // If user is logged in, redirect to appropriate page
    if (user && !authError) {
      const redirectPath = await getOnboardingRedirectPath()
      redirect(redirectPath)
    }
  } catch (error) {
    // If there's an error checking auth (e.g., env vars missing), 
    // continue to show landing page
    // This is expected in development or if environment variables are not set
    console.warn('Error checking auth on root page:', error)
  }

  // No active session - render landing page
  // Client component will handle OAuth tokens in URL hash
  return <LandingPageClient />
}
