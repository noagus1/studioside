'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Camera, Loader2, Key, Check, X, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { updateUserProfile } from '@/actions/updateUserProfile'
import { uploadAvatar } from '@/actions/uploadAvatar'
import { updateNotificationsPreference } from '@/actions/updateNotificationsPreference'
import { unlinkOAuthProvider } from '@/actions/unlinkOAuthProvider'
import { logout } from '@/actions/logout'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { UserSettingsData } from '@/actions/getUserSettings'

interface AccountSectionProps {
  userSettings?: UserSettingsData | null
}

export default function AccountSection({ userSettings }: AccountSectionProps) {
  const userProfile = userSettings?.profile
  const [name, setName] = React.useState(userProfile?.full_name || '')
  const [avatarUrl, setAvatarUrl] = React.useState(userProfile?.avatar_url || null)
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(
    userProfile?.notifications_enabled ?? true
  )
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [savingNotifications, setSavingNotifications] = React.useState(false)
  const [linkingProvider, setLinkingProvider] = React.useState<string | null>(null)
  const [unlinkingProvider, setUnlinkingProvider] = React.useState<string | null>(null)
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Update state when userSettings changes
  React.useEffect(() => {
    if (userProfile) {
      setName(userProfile.full_name || '')
      setAvatarUrl(userProfile.avatar_url)
      setNotificationsEnabled(userProfile.notifications_enabled ?? true)
    }
  }, [userProfile])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleNameChange = (value: string) => {
    setName(value)
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    // Debounce the save
    debounceTimeoutRef.current = setTimeout(async () => {
      setSaving(true)
      const result = await updateUserProfile({ full_name: value.trim() || null })
      setSaving(false)
      
      if ('error' in result) {
        toast.error(result.message)
        // Revert on error
        setName(userProfile?.full_name || '')
      } else {
        toast.success('Name updated')
      }
    }, 1000)
  }

  const handleNotificationsToggle = async (enabled: boolean) => {
    setNotificationsEnabled(enabled)
    setSavingNotifications(true)
    
    const result = await updateNotificationsPreference(enabled)
    setSavingNotifications(false)
    
    if ('error' in result) {
      toast.error(result.message)
      // Revert on error
      setNotificationsEnabled(!enabled)
    } else {
      toast.success(enabled ? 'Notifications enabled' : 'Notifications disabled')
    }
  }

  const handleLinkProvider = async (provider: 'google') => {
    setLinkingProvider(provider)
    
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        toast.error('Supabase is not configured')
        setLinkingProvider(null)
        return
      }

      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?link=true`
        : '/auth/callback?link=true'

      // Use signInWithOAuth - Supabase will automatically link if email matches
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      })

      if (oauthError) {
        toast.error(oauthError.message)
        setLinkingProvider(null)
      }
      // If successful, user will be redirected to OAuth provider, then back to callback
      // Supabase will automatically link the identity if the email matches
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to link provider')
      setLinkingProvider(null)
    }
  }

  const handleUnlinkProvider = async (provider: string) => {
    // Confirm before unlinking
    if (!confirm(`Are you sure you want to unlink ${provider}? You'll need to link it again to use it for sign-in.`)) {
      return
    }

    setUnlinkingProvider(provider)
    
    const result = await unlinkOAuthProvider(provider)
    setUnlinkingProvider(null)
    
    if ('error' in result) {
      toast.error(result.message)
    } else {
      toast.success(`${provider} unlinked successfully`)
      // Refresh the page to update the UI
      window.location.reload()
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const hasGoogle = userSettings?.connectedProviders.includes('google') ?? false
  const hasEmailPassword = userSettings?.hasEmailPassword ?? false

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const uploadResult = await uploadAvatar(formData)

      if ('error' in uploadResult) {
        toast.error(uploadResult.message)
        setUploading(false)
        return
      }

      // Update profile with new avatar URL
      const updateResult = await updateUserProfile({ avatar_url: uploadResult.url })

      if ('error' in updateResult) {
        toast.error(updateResult.message)
      } else {
        setAvatarUrl(uploadResult.url)
        toast.success('Avatar updated successfully')
      }
    } catch (error) {
      toast.error('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="pl-10 pr-10 pt-6 pb-6 space-y-6">
      <div>
        <h2 className="text-2xl font-medium">Account Settings</h2>
      </div>

      {/* First Card: Profile Picture, Name, Email */}
      <Card className="shadow-none">
        <CardContent className="p-0">
          {/* Avatar Row */}
          <div className="flex items-center justify-between py-4 px-6 border-b">
            <div className="flex-1">
              <label className="text-sm font-medium">Profile Picture</label>
              <p className="text-xs text-muted-foreground mt-1 mr-4">
                Upload a profile picture to personalize your account
              </p>
            </div>
            <div className="flex-1 max-w-md flex justify-end">
              <label htmlFor="avatar-upload" className="cursor-pointer group relative">
                <Avatar className="h-12 w-12 transition-opacity group-hover:opacity-80">
                  <AvatarImage src={avatarUrl || undefined} alt={name || 'User'} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                {uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </div>
          </div>

          {/* Name Row */}
          <div className="flex items-center justify-between py-4 px-6 border-b">
            <div className="flex-1">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <p className="text-xs text-muted-foreground mt-1 mr-4">
                This is how your name appears to others
              </p>
            </div>
            <div className="flex-1 max-w-md relative">
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter your name"
                disabled={saving}
              />
              {saving && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Email Row */}
          <div className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
            <div className="flex-1">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <p className="text-xs text-muted-foreground mt-1 mr-4">
                Linked to your account. Changing your email requires re-authentication (coming soon).
              </p>
            </div>
            <div className="flex-1 max-w-md">
              <Input
                id="email"
                value={userSettings?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Contact an admin if you need this updated today.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Second Card: Notifications */}
      <Card className="shadow-none">
        <CardContent className="p-0">
          {/* Notifications Row */}
          <div className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
            <div className="flex-1">
              <label htmlFor="notifications" className="text-sm font-medium">
                Notifications
              </label>
              <p className="text-xs text-muted-foreground mt-1 mr-4">
                Enable or disable notifications for your account
              </p>
            </div>
            <div className="flex-1 max-w-md flex items-center justify-end">
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationsToggle}
                disabled={savingNotifications}
              />
              {savingNotifications && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Third Card: Sign-in Methods */}
      <Card className="shadow-none mb-6">
        <CardContent className="p-0">
          <div className="py-4 px-6 border-b">
            <div className="flex-1">
              <label className="text-sm font-medium">Sign-in Methods</label>
              <p className="text-xs text-muted-foreground mt-1 mr-4">
                Manage how you sign in to your account
              </p>
            </div>
          </div>

          {/* Email/Password Method */}
          <div className="flex items-center justify-between py-4 px-6 border-b">
            <div className="flex-1 flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Email & Password</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sign in with your email and password
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasEmailPassword ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-xs">Active</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Not set up</span>
              )}
            </div>
          </div>

          {/* Google OAuth Method */}
          <div className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
            <div className="flex-1 flex items-center gap-3">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <div>
                <div className="text-sm font-medium">Google</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sign in with your Google account
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasGoogle ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-xs">Connected</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnlinkProvider('google')}
                    disabled={unlinkingProvider === 'google' || (!hasEmailPassword && hasGoogle)}
                    className="ml-2 h-8 text-xs"
                  >
                    {unlinkingProvider === 'google' ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Unlinking...
                      </>
                    ) : (
                      'Unlink'
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLinkProvider('google')}
                  disabled={linkingProvider === 'google'}
                  className="h-8 text-xs"
                >
                  {linkingProvider === 'google' ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Linking...
                    </>
                  ) : (
                    'Link Account'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logout Button */}
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 hover:bg-destructive/10 transition-colors">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 text-destructive font-medium text-sm hover:text-destructive/90 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )
}
