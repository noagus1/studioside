'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Camera, Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateStudio } from '@/actions/updateStudio'
import { uploadStudioLogo } from '@/actions/uploadStudioLogo'
import type { Studio } from '@/types/studio'

interface StudioIdentityCardProps {
  studio: Studio
  canEdit: boolean
  onStudioUpdated?: (updates: Partial<Studio>) => void
}

export function StudioIdentityCard({
  studio,
  canEdit,
  onStudioUpdated,
}: StudioIdentityCardProps) {
  const [name, setName] = React.useState(studio.name ?? '')
  const [logoUrl, setLogoUrl] = React.useState<string | null>(studio.logo_url)
  const [savingName, setSavingName] = React.useState(false)
  const [uploadingLogo, setUploadingLogo] = React.useState(false)
  const [lastSavedName, setLastSavedName] = React.useState(studio.name ?? '')

  React.useEffect(() => {
    setName(studio.name ?? '')
    setLogoUrl(studio.logo_url ?? null)
    setLastSavedName(studio.name ?? '')
  }, [studio])

  const getInitials = (value: string | null) => {
    if (!value) return 'ST'
    return value
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const commitName = async () => {
    if (!canEdit || savingName) return
    const trimmed = name.trim()
    if (!trimmed) {
      setName(lastSavedName)
      return
    }
    if (trimmed === lastSavedName) return

    setSavingName(true)
    const result = await updateStudio({ name: trimmed })
    if ('error' in result) {
      toast.error(result.message)
      setSavingName(false)
      setName(lastSavedName)
      return
    }

    setLastSavedName(trimmed)
    onStudioUpdated?.({ name: trimmed })
    toast.success('Studio name updated')
    setSavingName(false)
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const uploadResult = await uploadStudioLogo(formData)
      if ('error' in uploadResult) {
        toast.error(uploadResult.message)
        setUploadingLogo(false)
        return
      }

      const updateResult = await updateStudio({ logo_url: uploadResult.url })
      if ('error' in updateResult) {
        toast.error(updateResult.message)
        setUploadingLogo(false)
        return
      }

      setLogoUrl(uploadResult.url)
      onStudioUpdated?.({ logo_url: uploadResult.url })
      toast.success('Logo updated')
    } catch (error) {
      toast.error('Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Studio identity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {canEdit ? (
              <label htmlFor="studio-logo-upload" className="group relative cursor-pointer">
                <Avatar className="h-16 w-16 transition-opacity group-hover:opacity-80">
                  <AvatarImage src={logoUrl || undefined} alt={name || 'Studio'} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {getInitials(name || studio.name || null)}
                  </AvatarFallback>
                </Avatar>
                {uploadingLogo ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                )}
              </label>
            ) : (
              <Avatar className="h-16 w-16">
                <AvatarImage src={logoUrl || undefined} alt={name || 'Studio'} />
                <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                  {getInitials(name || studio.name || null)}
                </AvatarFallback>
              </Avatar>
            )}
            {canEdit && (
              <input
                id="studio-logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">Studio name</p>
              {savingName && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitName()
                  }
                }}
                placeholder="Studio name"
                disabled={!canEdit || savingName}
                maxLength={32}
                className="sm:max-w-md"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Keep this short and recognizable. Changes save automatically. Advanced fields live in Studio Settings.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
