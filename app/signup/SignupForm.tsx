'use client'

/**
 * Signup Form Component
 * 
 * Client component for email/password registration.
 * Handles sign up and redirects after successful registration.
 */

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

export default function SignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()
      
      if (!supabase) {
        setError('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
        setIsLoading(false)
        return
      }

      // Construct the redirect URL for email confirmation
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback`
        : '/auth/callback'

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${redirectTo}?next=/complete-account`,
        },
      })

      if (otpError) {
        setError(otpError.message)
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
      setIsLoading(false)
    }
  }

  // Show success message instead of form
  if (success) {
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Check your email
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            We&apos;ve sent a secure link to <strong className="text-foreground">{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Click it to finish setting up and choose your password.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="you@example.com"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Sending link...' : 'Send magic link'}
      </button>

      <div className="text-center text-sm">
        <p className="text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  )
}

