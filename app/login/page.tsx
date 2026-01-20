import { redirect } from 'next/navigation'
import AuthForm from './AuthForm'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { getOnboardingRedirectPath } from '@/actions/getOnboardingRedirectPath'

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; message?: string }>
}

/**
 * Login Page
 * 
 * Server component that handles authentication check and redirects.
 * If user is already authenticated, redirects to dashboard or redirect param.
 * Otherwise, displays the login form.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const message = params.message
  
  // Try to check if user is authenticated, but don't fail if env vars are missing
  // We dynamically import to avoid module load errors if env vars are missing
  try {
    const { getSupabaseClient } = await import('@/lib/supabase/serverClient')
    const supabase = await getSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // User is already logged in, redirect based on onboarding status or redirect param
      if (params.redirect) {
        // If redirect param is explicitly set, use it
        redirect(params.redirect)
      } else {
        // Otherwise, determine redirect path based on onboarding status
        const redirectPath = await getOnboardingRedirectPath()
        redirect(redirectPath)
      }
    }
  } catch (error) {
    // If env vars are missing or there's an error, just show the login form
    // The client-side auth will handle the actual login
    // This is expected when environment variables are not set
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.svg"
              alt="Studioside Logo"
              width={48}
              height={48}
              className="dark:invert"
            />
          </div>
          <h1 className="text-3xl font-bold">Open your studio</h1>
          <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1">Enter your email to continue to Studioside <ArrowUpRight className="h-4 w-4" /></p>
        </div>

        {message && (
          <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-md">
            {message}
          </div>
        )}

        <AuthForm />

        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

