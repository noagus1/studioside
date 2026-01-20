import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'

/**
 * Layout for Onboarding Routes
 * 
 * Wraps onboarding pages with authentication check only.
 * Does NOT check for full_name - that's the purpose of onboarding.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <>{children}</>
}









