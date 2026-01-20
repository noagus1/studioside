'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { setAuthSession } from '@/actions/setAuthSession'
import { getOnboardingRedirectPath } from '@/actions/getOnboardingRedirectPath'
import { preserveInviteTokenFromPath } from '@/actions/preserveInviteToken'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Auth Callback Handler
 *
 * Handles Supabase auth callbacks from email confirmation links.
 * Processes tokens from URL hash and sets the session.
 * Automatically logs users in after email confirmation.
 */
export function AuthCallbackHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isMounted, setIsMounted] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const hasProcessedRef = React.useRef(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const [hasHashTokens, setHasHashTokens] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const isCallbackLikeRoute = pathname === '/auth/callback' || pathname?.startsWith('/join')

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (!isMounted || typeof window === 'undefined') {
      return
    }

    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const hasAccessToken = params.has('access_token')
    const hasRefreshToken = params.has('refresh_token')
    const hasType = params.has('type')
    const hasTokens = hasAccessToken || hasRefreshToken || hasType

    setHasHashTokens(hasTokens)

    if (!isCallbackLikeRoute && !hasTokens) {
      return
    }

    setIsProcessing(true)

    async function handleAuthCallback() {
      if (hasProcessedRef.current) {
        setIsProcessing(false)
        return
      }

      const supabase = getSupabaseClient()
      if (!supabase) {
        setError('Supabase is not configured')
        setIsProcessing(false)
        return
      }

      const authenticatedRoutes = ['/dashboard', '/onboarding', '/settings']
      const isAuthenticatedRoute = authenticatedRoutes.some(route => pathname?.startsWith(route))

      if (isAuthenticatedRoute) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (session) {
            setIsProcessing(false)
            return
          }
        } catch (err) {
          console.warn('Failed to check existing session:', err)
        }
      }

      timeoutRef.current = setTimeout(() => {
        if (hasProcessedRef.current) return
        console.error('Auth callback timeout - processing took too long')
        setError('Authentication is taking longer than expected. Please try signing in manually.')
        setIsProcessing(false)
        hasProcessedRef.current = true
        setTimeout(() => {
          router.push('/login?error=Authentication timeout. Please try signing in again.')
        }, 2000)
      }, 10000)

      try {
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        async function getSessionWithRetry(
          supabaseClient: SupabaseClient,
          maxRetries = 3
        ): Promise<{ session: any } | null> {
          for (let i = 0; i < maxRetries; i++) {
            const {
              data: { session },
            } = await supabaseClient.auth.getSession()
            if (session) {
              return { session }
            }
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
          return null
        }

        async function redirectAfterSession(session: any, supabaseClient: SupabaseClient) {
          hasProcessedRef.current = true

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }

          try {
            await setAuthSession(session.access_token, session.refresh_token)
          } catch (err) {
            console.warn('Failed to set auth cookies:', err)
          }

          if (typeof window !== 'undefined') {
            localStorage.removeItem('settings-modal-is-open')
            localStorage.removeItem('settings-modal-section')
          }

          window.history.replaceState(null, '', window.location.pathname)
          setIsProcessing(false)

          const nextPath = searchParams.get('next')
          if (nextPath) {
            // Preserve invite token if present in the next path
            if (nextPath.includes('/join') && nextPath.includes('token=')) {
              await preserveInviteTokenFromPath(nextPath)
            }
            router.push(nextPath)
            router.refresh()
            return
          }

          try {
            const redirectPath = await getOnboardingRedirectPath()
            router.push(redirectPath)
            router.refresh()
            return
          } catch (err) {
            console.warn('Failed to get onboarding redirect path:', err)
            router.push('/dashboard')
            router.refresh()
            return
          }
        }

        if (accessToken && refreshToken) {
          if (type === 'recovery') {
            const hash = window.location.hash
            router.push(`/auth/reset-password${hash}`)
            return
          }

          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            hasProcessedRef.current = true
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }
            setError('Failed to process authentication')
            setIsProcessing(false)
            setTimeout(() => {
              router.push('/login?error=Authentication failed. Please try signing in again.')
            }, 2000)
            return
          }

          if (session) {
            await redirectAfterSession(session, supabase)
            return
          }

          if (type === 'signup') {
            let retries = 0
            const maxRetries = 5

            while (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 500))
              const sessionResult = await getSessionWithRetry(supabase, 3)

              if (sessionResult?.session) {
                await redirectAfterSession(sessionResult.session, supabase)
                return
              }

              retries++
            }

            const finalCheck = await getSessionWithRetry(supabase, 1)
            if (finalCheck?.session) {
              await redirectAfterSession(finalCheck.session, supabase)
              return
            }

            setError('Session is being processed. Please wait...')
            setTimeout(async () => {
              if (hasProcessedRef.current) return

              const lastCheck = await getSessionWithRetry(supabase, 1)
              if (lastCheck?.session) {
                await redirectAfterSession(lastCheck.session, supabase)
              } else {
                hasProcessedRef.current = true
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current)
                  timeoutRef.current = null
                }
                setError('Unable to complete sign in. Please try the confirmation link again.')
                setIsProcessing(false)
              }
            }, 1000)
            return
          }
        }

        const sessionResult = await getSessionWithRetry(supabase, 2)

        if (sessionResult?.session) {
          await redirectAfterSession(sessionResult.session, supabase)
          return
        }

        hasProcessedRef.current = true

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }

        if (type === 'recovery') {
          setIsProcessing(false)
          router.push('/login?error=Invalid or expired password reset link.')
        } else if (type === 'signup') {
          setError('Processing your confirmation...')
          setTimeout(async () => {
            if (hasProcessedRef.current) return

            const check = await getSessionWithRetry(supabase, 3)
            if (check?.session) {
              await redirectAfterSession(check.session, supabase)
            } else {
              hasProcessedRef.current = true
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
              }
              setError('Unable to complete sign in. Please try the confirmation link again.')
              setIsProcessing(false)
            }
          }, 1000)
        } else {
          setIsProcessing(false)
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        hasProcessedRef.current = true

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }

        setError('An error occurred during authentication')
        setIsProcessing(false)

        setTimeout(() => {
          router.push('/login?error=Authentication failed. Please try signing in again.')
        }, 2000)
      }
    }

    if (hasAccessToken && hasRefreshToken) {
      void handleAuthCallback()
    } else if (hasType && (hasAccessToken || hasRefreshToken)) {
      void handleAuthCallback()
    } else {
      setIsProcessing(false)
    }
  }, [router, pathname, isMounted, isCallbackLikeRoute, searchParams])

  if (!isMounted || (!isCallbackLikeRoute && !hasHashTokens)) {
    return null
  }

  if (isProcessing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <p className="text-xs text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return null
}
