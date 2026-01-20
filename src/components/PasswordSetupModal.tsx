'use client'

/**
 * Password Setup Modal
 *
 * Non-blocking modal that appears after first successful auth entry
 * to prompt users to set a password for faster future sign-ins.
 *
 * Shows once, can be dismissed, never shows again after password is set.
 */

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updatePassword } from '@/actions/updatePassword'
import { setHasPassword } from '@/actions/setHasPassword'
import { checkUserHasPassword } from '@/actions/checkUserHasPassword'
import { getSupabaseClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'password-setup-modal-shown'
const CACHE_KEY = 'password-check-cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function PasswordSetupModal() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup'
    if (isPublicPage) return

    const hasBeenShown = localStorage.getItem(STORAGE_KEY) === 'true'
    if (hasBeenShown || hasChecked) return

    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const { hasPassword: cachedHasPassword, timestamp } = JSON.parse(cached)
        const now = Date.now()
        if (now - timestamp < CACHE_DURATION && cachedHasPassword === true) {
          setHasChecked(true)
          return
        }
      } catch {
        // ignore bad cache
      }
    }

    checkUserStatus()
  }, [pathname, hasChecked])

  async function checkUserStatus() {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      setUserId(user.id)

      const hasPassword = await checkUserHasPassword()

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            hasPassword,
            timestamp: Date.now(),
          })
        )
      }
      setHasChecked(true)

      if (hasPassword === true || hasPassword === null) {
        return
      }

      setTimeout(() => {
        setOpen(true)
      }, 1500)
    } catch (error) {
      console.error('Failed to check password status:', error)
    }
  }

  async function handleSetPassword() {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await updatePassword(password)

      if ('error' in result) {
        setError(result.message)
        setIsLoading(false)
        return
      }

      if (userId) {
        try {
          await setHasPassword(userId, true)
        } catch (err) {
          console.warn('Failed to set has_password flag:', err)
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, 'true')
      }
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password')
      setIsLoading(false)
    }
  }

  function handleSkip() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in faster next time</DialogTitle>
          <DialogDescription>
            Set a password so you can sign in instantly without email links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              minLength={6}
            />
            <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
              Confirm Password
            </label>
            <Input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              minLength={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleSkip} disabled={isLoading}>
            Skip for now
          </Button>
          <Button type="button" onClick={handleSetPassword} disabled={isLoading || !password || !confirmPassword}>
            {isLoading ? 'Setting...' : 'Set password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
