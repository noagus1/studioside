'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Camera, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { updateStudio } from '@/actions/updateStudio'
import { uploadStudioLogo } from '@/actions/uploadStudioLogo'
import type { Studio } from '@/types/studio'
import type { StudioSettingsData } from '@/actions/getStudioSettings'
import { Info } from 'lucide-react'

interface SettingsPageClientProps {
  initialData: StudioSettingsData
}

// Common timezones list
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Phoenix', label: 'Arizona' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Rome', label: 'Rome' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Australia/Melbourne', label: 'Melbourne' },
]

export function SettingsPageClient({ initialData }: SettingsPageClientProps) {
  const [studio, setStudio] = React.useState<Studio>(initialData.studio)

  // Form state
  const [name, setName] = React.useState(studio.name || '')
  const [description, setDescription] = React.useState(studio.description || '')
  const [logoUrl, setLogoUrl] = React.useState<string | null>(studio.logo_url)
  const [timezone, setTimezone] = React.useState(studio.timezone || 'UTC')
  const [bufferMinutes, setBufferMinutes] = React.useState(
    studio.default_buffer_minutes?.toString() || '0'
  )
  const [overtimeRules, setOvertimeRules] = React.useState(studio.overtime_rules || '')

  // Per-section saving states
  const [savingInformation, setSavingInformation] = React.useState(false)
  const [savingScheduling, setSavingScheduling] = React.useState(false)
  const [savingPolicies, setSavingPolicies] = React.useState(false)
  const [savingLogo, setSavingLogo] = React.useState(false)

  // Track original values to detect changes
  const originalValues = React.useRef({
    name: studio.name || '',
    description: studio.description || '',
    logo_url: studio.logo_url,
    timezone: studio.timezone || 'UTC',
    default_buffer_minutes: studio.default_buffer_minutes || 0,
    overtime_rules: studio.overtime_rules || '',
  })

  // Check if sections have changes
  const hasInformationChanges =
    name.trim() !== originalValues.current.name ||
    description.trim() !== originalValues.current.description ||
    logoUrl !== originalValues.current.logo_url

  const hasSchedulingChanges =
    timezone !== originalValues.current.timezone ||
    parseInt(bufferMinutes, 10) !== originalValues.current.default_buffer_minutes

  const hasPoliciesChanges = overtimeRules.trim() !== originalValues.current.overtime_rules

  // Timezone preview
  const [timezonePreview, setTimezonePreview] = React.useState('')

  // Update timezone preview
  React.useEffect(() => {
    if (timezone) {
      try {
        const now = new Date()
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
        setTimezonePreview(formatter.format(now))
      } catch (error) {
        setTimezonePreview('Invalid timezone')
      }
    }
  }, [timezone])

  // Update preview every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (timezone) {
        try {
          const now = new Date()
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
          setTimezonePreview(formatter.format(now))
        } catch (error) {
          setTimezonePreview('Invalid timezone')
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [timezone])

  // Handle logo upload (auto-saves on upload)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setSavingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const result = await uploadStudioLogo(formData)

      if ('error' in result) {
        toast.error(result.message)
        setSavingLogo(false)
        return
      }

      // Update logo URL immediately
      setLogoUrl(result.url)

      // Update studio with new logo URL
      const updateResult = await updateStudio({ logo_url: result.url })

      if ('error' in updateResult) {
        toast.error(updateResult.message)
        setSavingLogo(false)
        return
      }

      originalValues.current.logo_url = result.url
      toast.success('Logo updated successfully')
    } catch (error) {
      toast.error('Failed to upload logo')
    } finally {
      setSavingLogo(false)
    }
  }

  // Handle save information section
  const handleSaveInformation = async () => {
    if (!hasInformationChanges) return

    setSavingInformation(true)
    try {
      const updateData: {
        name?: string
        description?: string | null
        logo_url?: string | null
      } = {}

      if (name.trim() !== originalValues.current.name) {
        updateData.name = name.trim()
      }

      if (description.trim() !== originalValues.current.description) {
        updateData.description = description.trim() || null
      }

      // Note: logo_url is handled separately via handleLogoUpload
      // but we include it here for completeness in case it was changed
      if (logoUrl !== originalValues.current.logo_url) {
        updateData.logo_url = logoUrl
      }

      if (Object.keys(updateData).length === 0) {
        setSavingInformation(false)
        return
      }

      const result = await updateStudio(updateData)

      if ('error' in result) {
        toast.error(result.message)
        setSavingInformation(false)
        return
      }

      // Update original values
      if (updateData.name !== undefined) {
        originalValues.current.name = name.trim()
        setStudio({ ...studio, name: name.trim() })
      }
      if (updateData.description !== undefined) {
        originalValues.current.description = description.trim()
        setStudio({ ...studio, description: description.trim() || null })
      }
      if (updateData.logo_url !== undefined) {
        originalValues.current.logo_url = logoUrl
      }

      toast.success('Studio information saved successfully')
    } catch (error) {
      toast.error('Failed to save studio information')
    } finally {
      setSavingInformation(false)
    }
  }

  // Handle save scheduling section
  const handleSaveScheduling = async () => {
    if (!hasSchedulingChanges) return

    setSavingScheduling(true)
    try {
      const bufferValue = parseInt(bufferMinutes, 10)
      if (isNaN(bufferValue) || bufferValue < 0 || bufferValue > 60) {
        toast.error('Please enter a valid number between 0 and 60 for buffer minutes')
        setSavingScheduling(false)
        return
      }

      const updateData: {
        timezone?: string
        default_buffer_minutes?: number
      } = {}

      if (timezone !== originalValues.current.timezone) {
        updateData.timezone = timezone
      }

      if (bufferValue !== originalValues.current.default_buffer_minutes) {
        updateData.default_buffer_minutes = bufferValue
      }

      if (Object.keys(updateData).length === 0) {
        setSavingScheduling(false)
        return
      }

      const result = await updateStudio(updateData)

      if ('error' in result) {
        toast.error(result.message)
        setSavingScheduling(false)
        return
      }

      // Update original values
      if (updateData.timezone !== undefined) {
        originalValues.current.timezone = timezone
        setStudio({ ...studio, timezone })
      }
      if (updateData.default_buffer_minutes !== undefined) {
        originalValues.current.default_buffer_minutes = bufferValue
        setStudio({ ...studio, default_buffer_minutes: bufferValue })
      }

      toast.success('Scheduling settings saved successfully')
    } catch (error) {
      toast.error('Failed to save scheduling settings')
    } finally {
      setSavingScheduling(false)
    }
  }

  // Handle save policies section
  const handleSavePolicies = async () => {
    if (!hasPoliciesChanges) return

    setSavingPolicies(true)
    try {
      const trimmedRules = overtimeRules.trim()

      const result = await updateStudio({ overtime_rules: trimmedRules || null })

      if ('error' in result) {
        toast.error(result.message)
        setSavingPolicies(false)
        return
      }

      originalValues.current.overtime_rules = trimmedRules
      setStudio({ ...studio, overtime_rules: trimmedRules || null })
      toast.success('Overtime rules saved successfully')
    } catch (error) {
      toast.error('Failed to save overtime rules')
    } finally {
      setSavingPolicies(false)
    }
  }

  // Handle cancel information section
  const handleCancelInformation = () => {
    setName(originalValues.current.name)
    setDescription(originalValues.current.description)
    setLogoUrl(originalValues.current.logo_url)
  }

  // Handle cancel scheduling section
  const handleCancelScheduling = () => {
    setTimezone(originalValues.current.timezone)
    setBufferMinutes(originalValues.current.default_buffer_minutes.toString())
  }

  // Handle cancel policies section
  const handleCancelPolicies = () => {
    setOvertimeRules(originalValues.current.overtime_rules)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isOwnerOrAdmin = initialData.isOwnerOrAdmin

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-medium">Preferences</h2>
        {!isOwnerOrAdmin && (
          <span className="text-sm text-muted-foreground">(View only)</span>
        )}
      </div>

      {/* Studio Information Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Studio Details</h3>
        <Card className="shadow-none">
          <CardContent className="p-0">
            {/* Logo Row */}
            <div className="flex items-center justify-between py-4 px-6 border-b">
              <div className="flex-1">
                <label className="text-sm font-medium">Studio Logo</label>
                <p className="text-xs text-muted-foreground mt-1 mr-4">
                  Click on the logo to upload a new image.
                </p>
              </div>
              <div className="flex-1 max-w-md flex justify-end">
                {isOwnerOrAdmin ? (
                  <label htmlFor="logo-upload" className="cursor-pointer group relative">
                    <Avatar className="h-12 w-12 transition-opacity group-hover:opacity-80">
                      <AvatarImage src={logoUrl || undefined} alt={name || 'Studio'} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                        {getInitials(name || 'Studio')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                  </label>
                ) : (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={logoUrl || undefined} alt={name || 'Studio'} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                      {getInitials(name || 'Studio')}
                    </AvatarFallback>
                  </Avatar>
                )}
                {isOwnerOrAdmin && (
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={savingLogo}
                  />
                )}
              </div>
            </div>

            {/* Studio Name Row */}
            <div className="flex items-center justify-between py-4 px-6 border-b">
              <div className="flex-1">
                <label htmlFor="studio-name" className="text-sm font-medium">
                  Studio name
                </label>
                <p className="text-xs text-muted-foreground mt-1 mr-4">
                  This is your studio's visible name. For example, the name of your company or department.
                </p>
              </div>
              <div className="flex-1 max-w-md">
                <Input
                  id="studio-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter studio name"
                  disabled={savingInformation || !isOwnerOrAdmin}
                  maxLength={32}
                  className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Please use 32 characters at maximum.
                </p>
              </div>
            </div>

            {/* Description Row */}
            <div className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
              <div className="flex-1">
                <label htmlFor="studio-description" className="text-sm font-medium">
                  Description
                </label>
                <p className="text-xs text-muted-foreground mt-1 mr-4">
                  A brief description of your studio. This helps others understand what your studio does.
                </p>
              </div>
              <div className="flex-1 max-w-md">
                <Textarea
                  id="studio-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter studio description (optional)"
                  disabled={savingInformation || !isOwnerOrAdmin}
                  rows={3}
                  maxLength={500}
                  className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Please use 500 characters at maximum.
                </p>
              </div>
            </div>

            {/* Save and Cancel Buttons - Only show for owners/admins */}
            {isOwnerOrAdmin && (
              <div className="flex justify-end gap-2 p-6 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancelInformation}
                  disabled={!hasInformationChanges || savingInformation}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveInformation}
                  disabled={!hasInformationChanges || savingInformation}
                >
                  {savingInformation ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scheduling Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Scheduling</h3>
        <Card className="shadow-none">
          <CardContent className="p-0">
            {/* Timezone Row */}
            <div className="flex items-center justify-between py-4 px-6 border-b">
              <div className="flex-1">
                <label htmlFor="timezone" className="text-sm font-medium">
                  Timezone
                </label>
                <p className="text-xs text-muted-foreground mt-1 mr-4">
                  Set the default timezone for this studio.
                </p>
              </div>
              <div className="flex-1 max-w-md">
                <Select 
                  value={timezone} 
                  onValueChange={setTimezone} 
                  disabled={savingScheduling || !isOwnerOrAdmin}
                >
                  <SelectTrigger 
                    id="timezone"
                    className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                  >
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {timezonePreview && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current time: <span className="font-mono">{timezonePreview}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Default Buffer Time Row */}
            <div className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
              <div className="flex-1">
                <label htmlFor="buffer-minutes" className="text-sm font-medium">
                  Default Buffer Time
                </label>
                <p className="text-xs text-muted-foreground mt-1 mr-4">
                  Set the default buffer time between sessions in minutes (0-60).
                </p>
              </div>
              <div className="flex-1 max-w-md">
                <Input
                  id="buffer-minutes"
                  type="number"
                  min="0"
                  max="60"
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(e.target.value)}
                  placeholder="0"
                  disabled={savingScheduling || !isOwnerOrAdmin}
                  className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                />
              </div>
            </div>

            {/* Save and Cancel Buttons - Only show for owners/admins */}
            {isOwnerOrAdmin && (
              <div className="flex justify-end gap-2 p-6 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancelScheduling}
                  disabled={!hasSchedulingChanges || savingScheduling}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveScheduling}
                  disabled={!hasSchedulingChanges || savingScheduling}
                >
                  {savingScheduling ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Policies Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Policies</h3>
        <Card className="shadow-none">
          <CardContent className="p-0">
            {/* Overtime Rules Row */}
            <div className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
              <div className="flex-1">
                <label htmlFor="overtime-rules" className="text-sm font-medium">
                  Overtime Rules
                </label>
                <p className="text-xs text-muted-foreground mt-1 mr-4">
                  Define default overtime rules and policies for this studio.
                </p>
              </div>
              <div className="flex-1 max-w-md">
                <Textarea
                  id="overtime-rules"
                  value={overtimeRules}
                  onChange={(e) => setOvertimeRules(e.target.value)}
                  placeholder="Enter overtime rules and policies (optional)"
                  disabled={savingPolicies || !isOwnerOrAdmin}
                  rows={4}
                  className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                />
              </div>
            </div>

            {/* Save and Cancel Buttons - Only show for owners/admins */}
            {isOwnerOrAdmin && (
              <div className="flex justify-end gap-2 p-6 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancelPolicies}
                  disabled={!hasPoliciesChanges || savingPolicies}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePolicies}
                  disabled={!hasPoliciesChanges || savingPolicies}
                >
                  {savingPolicies ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rate Presets Section */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Rate Presets
          </CardTitle>
          <CardDescription>Manage default rate presets for sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Rate presets coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}
