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

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

function logEnvStatus() {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  const status = REQUIRED_ENV_VARS.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = Boolean(process.env[key])
    return acc
  }, {})
  console.info('[landing] env presence:', status)
}

function hasRequiredEnvVars(): boolean {
  return REQUIRED_ENV_VARS.every((key) => Boolean(process.env[key]))
}

function isSafeRedirectPath(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/')
}

export default async function HomePage() {
  logEnvStatus()

  // Check for active session only if server env is configured.
  try {
    if (hasRequiredEnvVars()) {
      const supabase = await getSupabaseClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (user && !authError) {
        const redirectPath = await getOnboardingRedirectPath()
        if (redirectPath && isSafeRedirectPath(redirectPath)) {
          redirect(redirectPath)
        } else if (redirectPath) {
          console.warn('[landing] invalid redirect path:', redirectPath)
        }
      }
    } else {
      console.warn('[landing] missing env vars; skipping auth check')
    }
  } catch (error) {
    // Always fall back to landing page when auth check fails.
    console.warn('[landing] error checking auth:', error)
  }

  return <LandingPageClient />
}
