'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updatePassword } from '@/actions/updatePassword'
import { updateUserProfile } from '@/actions/updateUserProfile'
import { getOnboardingRedirectPath } from '@/actions/getOnboardingRedirectPath'

interface CompleteAccountFormProps {
  initialName?: string
  email?: string | null
  hasPassword?: boolean | null
}

export default function CompleteAccountForm({
  initialName = '',
  email,
  hasPassword,
}: CompleteAccountFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialName)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords must match')
      return
    }

    setIsLoading(true)

    try {
      const passwordResult = await updatePassword(password)
      if ('error' in passwordResult) {
        setError(passwordResult.message)
        setIsLoading(false)
        return
      }

      if (fullName.trim() !== initialName.trim()) {
        const profileResult = await updateUserProfile({
          full_name: fullName.trim() || null,
        })

        if ('error' in profileResult) {
          setError(profileResult.message)
          setIsLoading(false)
          return
        }
      }

      const redirectPath = await getOnboardingRedirectPath()
      router.push(redirectPath)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {email && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Email</label>
          <Input type="email" value={email} disabled />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Your name
        </label>
        <Input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Name"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground mb-1">
          {hasPassword ? 'Update password' : 'Create a password'}
        </label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={isLoading}
          required
          minLength={6}
        />
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat password"
          disabled={isLoading}
          required
          minLength={6}
        />
        <p className="text-xs text-muted-foreground">
          We require a password to secure your account. You can change it later in
          settings.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Saving…' : 'Continue'}
      </Button>
    </form>
  )
}
