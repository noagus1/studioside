'use client'

/**
 * Reset Password Form Component
 * 
 * Client component for resetting password after clicking recovery link.
 * Uses tokens from URL hash to authenticate the password reset.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPasswordForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [hasTokens, setHasTokens] = useState(false)

  useEffect(() => {
    // Check if we have tokens in the URL hash
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      
      if (accessToken && refreshToken) {
        setHasTokens(true)
      } else {
        setError('Invalid or expired password reset link. Please request a new one.')
      }
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    if (!hasTokens) {
      setError('Invalid reset link. Please request a new password reset.')
      setIsLoading(false)
      return
    }

    try {
      const supabase = getSupabaseClient()
      
      if (!supabase) {
        setError('Supabase is not configured')
        setIsLoading(false)
        return
      }

      // First, set the session using tokens from URL
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setError('Invalid reset link. Please request a new password reset.')
        setIsLoading(false)
        return
      }

      const { data: { session }, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError || !session) {
        setError('Invalid or expired reset link. Please request a new password reset.')
        setIsLoading(false)
        return
      }

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message)
        setIsLoading(false)
        return
      }

      // Success - show message and redirect to login
      setSuccess(true)
      setIsLoading(false)

      // Clear URL hash
      window.history.replaceState(null, '', window.location.pathname)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login?message=Password reset successfully. Please sign in with your new password.')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
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
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Password Reset Successful!
          </h3>
          <p className="text-sm text-green-700 mb-4">
            Your password has been updated successfully.
          </p>
          <p className="text-xs text-green-600">
            Redirecting to sign in...
          </p>
        </div>
      </div>
    )
  }

  if (!hasTokens) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Invalid or expired password reset link.'}
        </div>
        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:underline"
          >
            Request a new password reset
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          New Password
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
          minLength={6}
        />
        <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm New Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="••••••••"
          disabled={isLoading}
          minLength={6}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Resetting password...' : 'Reset Password'}
      </button>
    </form>
  )
}
