'use client'

/**
 * Unified Auth Form Component
 * 
 * Email-first authentication flow that automatically branches based on user state:
 * - Step 1: Email input
 * - Step 2a: Password (if user has password)
 * - Step 2b: Magic link sent (if user exists but no password)
 * - Step 2c: Magic link sent (if new user)
 * 
 * Also supports Google OAuth as secondary option.
 */

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { setAuthSession } from '@/actions/setAuthSession'
import { checkUserAuthState } from '@/actions/checkUserAuthState'
import { createMagicLinkForExistingUser } from '@/actions/createMagicLinkForExistingUser'
import { setHasPassword } from '@/actions/setHasPassword'
import { getOnboardingRedirectPath } from '@/actions/getOnboardingRedirectPath'
import { preserveInviteTokenFromPath } from '@/actions/preserveInviteToken'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GoogleLogo } from '@/components/base/buttons/social-logos'

type AuthStep = 'email' | 'password' | 'magic-link-sent'

export default function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<AuthStep>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userHasPassword, setUserHasPassword] = useState(false)
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      setIsLoading(false)
      return
    }

    try {
      // Check user auth state
      const authState = await checkUserAuthState(email)

      if ('error' in authState) {
        setError(authState.message)
        setIsLoading(false)
        return
      }

      const { state } = authState

      if (state.userExists && state.hasPassword) {
        // User exists with password - show password screen
        setUserHasPassword(true)
        setStep('password')
        setIsLoading(false)
      } else if (state.userExists && !state.hasPassword) {
        // Existing account without password/profile completion - send to completion flow
        const redirectParam = searchParams.get('redirect') || ''
        // Preserve invite token if present in redirect param
        if (redirectParam.includes('/join') && redirectParam.includes('token=')) {
          await preserveInviteTokenFromPath(redirectParam)
        }
        
        const origin =
          typeof window !== 'undefined'
            ? window.location.origin
            : process.env.NEXT_PUBLIC_SITE_URL || ''
        // Preserve the original redirect if it exists, otherwise go to complete-account
        const nextPath = redirectParam || '/complete-account'
        const redirectTo = origin
          ? `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
          : `/auth/callback?next=${encodeURIComponent(nextPath)}`

        const magicLink = await createMagicLinkForExistingUser(email, redirectTo)

        if ('error' in magicLink) {
          setError(magicLink.message)
          setIsLoading(false)
          return
        }

        // Navigate to the action link directly to establish a session without email
        window.location.href = magicLink.actionLink
      } else {
        // User doesn't exist - send magic link to create account
        await sendMagicLink(email)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check email')
      setIsLoading(false)
    }
  }

  async function sendMagicLink(email: string) {
    try {
      const supabase = getSupabaseClient()

      if (!supabase) {
        setError('Supabase is not configured')
        setIsLoading(false)
        return
      }

      const redirectParam = searchParams.get('redirect') || ''
      // Preserve invite token if present in redirect param
      if (redirectParam.includes('/join') && redirectParam.includes('token=')) {
        await preserveInviteTokenFromPath(redirectParam)
      }
      
      const nextPath = redirectParam || ''
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`
        : `/auth/callback${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      })

      if (otpError) {
        setError(otpError.message)
        setIsLoading(false)
        return
      }

      // Show magic link sent screen
      setIsPasswordReset(false)
      setStep('magic-link-sent')
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
      setIsLoading(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      if (!supabase) {
        setError('Supabase is not configured')
        setIsLoading(false)
        return
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
        return
      }

      if (data.user && data.session) {
        // User is authenticated - set has_password flag if not already set
        try {
          await setHasPassword(data.user.id, true)
        } catch (err) {
          console.warn('Failed to set has_password flag:', err)
        }

        // Sync session to server-side cookies
        try {
          await setAuthSession(data.session.access_token, data.session.refresh_token)
        } catch (err) {
          console.warn('Failed to set auth cookies:', err)
        }

        // Clear settings modal state
        if (typeof window !== 'undefined') {
          localStorage.removeItem('settings-modal-is-open')
          localStorage.removeItem('settings-modal-section')
        }

        // Get redirect URL - use query param if provided, otherwise use onboarding redirect path
        const redirectParam = searchParams.get('redirect')
        if (redirectParam) {
          // Preserve invite token if present in redirect param
          if (redirectParam.includes('/join') && redirectParam.includes('token=')) {
            await preserveInviteTokenFromPath(redirectParam)
          }
          router.push(redirectParam)
          router.refresh()
        } else {
          // Use onboarding redirect path for proper workspace resolution
          try {
            const redirectPath = await getOnboardingRedirectPath()
            router.push(redirectPath)
            router.refresh()
          } catch (err) {
            console.warn('Failed to get onboarding redirect path:', err)
            router.push('/dashboard')
            router.refresh()
          }
        }
      } else if (data.user && !data.session) {
        setError('Please check your email and confirm your account before signing in.')
        setIsLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      if (!supabase) {
        setError('Supabase is not configured')
        setIsLoading(false)
        return
      }

      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : '/auth/callback'

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (oauthError) {
        setError(oauthError.message)
        setIsLoading(false)
      }
      // If successful, user will be redirected to Google, then back to /auth/callback
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  async function handleForgotPassword() {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      if (!supabase) {
        setError('Supabase is not configured')
        setIsLoading(false)
        return
      }

      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset-password`
        : '/auth/reset-password'

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (resetError) {
        setError(resetError.message)
        setIsLoading(false)
        return
      }

      // Show password reset email sent screen
      setIsPasswordReset(true)
      setStep('magic-link-sent')
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email')
      setIsLoading(false)
    }
  }

  // Email input screen
  if (step === 'email') {
    return (
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <Input
            type="email"
            id="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="work@email.com"
            disabled={isLoading}
            autoFocus
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Checking...' : 'Continue'}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full"
        >
          <GoogleLogo className="h-4 w-4 mr-2" />
          Continue with Google
        </Button>
      </form>
    )
  }

  // Password screen
  if (step === 'password') {
    return (
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <Input
            type="email"
            id="email"
            name="email"
            value={email}
            placeholder="work@email.com"
            disabled={true}
          />
        </div>

        <div className="animate-slide-down">
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
            Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              autoFocus
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus-visible:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Signing in...' : 'Continue'}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isLoading}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Forgot password?
          </button>
        </div>
      </form>
    )
  }

  // Magic link sent screen
  if (step === 'magic-link-sent') {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Check your email
          </h3>
          {isPasswordReset ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                We sent you a password reset link
              </p>
              <p className="text-xs text-muted-foreground">
                Click the link in your email to reset your password. The link will expire in 1 hour.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                We sent you a secure link to open Studioside
              </p>
              <p className="text-xs text-muted-foreground">
                Click the link in your email to continue. The link will expire in 1 hour.
              </p>
            </>
          )}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setError(null)
              setIsPasswordReset(false)
            }}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return null
}
