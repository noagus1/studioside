'use client'

/**
 * Login Form Component
 * 
 * Client component for email/password authentication.
 * Handles sign in and redirects after successful authentication.
 */

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { setAuthSession } from '@/actions/setAuthSession'
import Link from 'next/link'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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
        // User is authenticated with a valid session
        // Sync session to server-side cookies
        try {
          await setAuthSession(data.session.access_token, data.session.refresh_token)
        } catch (err) {
          console.warn('Failed to set auth cookies:', err)
          // Continue anyway - the client-side session will still work
        }
        
        // Clear settings modal state from localStorage on fresh sign-in
        // This ensures users start fresh on the dashboard, not with settings modal open
        if (typeof window !== 'undefined') {
          localStorage.removeItem('settings-modal-is-open')
          localStorage.removeItem('settings-modal-section')
        }
        
        // Get redirect URL from query params or default to dashboard
        const redirect = searchParams.get('redirect') || '/dashboard'
        router.push(redirect)
        router.refresh()
      } else if (data.user && !data.session) {
        // User exists but session is null - email not confirmed
        setError('Please check your email and confirm your account before signing in.')
        setIsLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="you@example.com"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="••••••••"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      <div className="text-center text-sm">
        <p className="text-muted-foreground">
          Don&apos;t have an account yet?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </form>
  )
}

