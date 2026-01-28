'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStudioSettings, type StudioSettingsData } from '@/actions/getStudioSettings'
import { updateStudio } from '@/actions/updateStudio'
import type { MembershipRole } from '@/types/db'
import { cn } from '@/lib/utils'

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

// Lightweight formatter to keep phone input readable while typing
const formatPhoneInput = (value: string) => {
  const raw = value ?? ''
  const hasPlus = raw.trim().startsWith('+')
  const digits = raw.replace(/\D/g, '')

  if (!digits) return hasPlus ? '+' : ''

  const formatLocal = (num: string) => {
    if (num.length <= 3) return num
    if (num.length <= 6) return `(${num.slice(0, 3)}) ${num.slice(3)}`
    const main = `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6, 10)}`
    const extra = num.slice(10)
    return extra ? `${main} ${extra}` : main
  }

  const formatInternational = (num: string) => {
    if (num.length <= 3) return num
    if (num.length <= 6) return `${num.slice(0, 3)}-${num.slice(3)}`
    const main = `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6, 10)}`
    const extra = num.slice(10)
    return extra ? `${main} ${extra}` : main
  }

  if (hasPlus) {
    const countryCodeLength = digits.length <= 11 ? 1 : digits.length <= 12 ? 2 : 3
    const countryCode = digits.slice(0, countryCodeLength)
    const nationalDigits = digits.slice(countryCodeLength)
    const nationalFormatted = nationalDigits ? ` ${formatInternational(nationalDigits)}` : ''
    return `+${countryCode}${nationalFormatted}`
  }

  return formatLocal(digits)
}

const isValidTimezone = (tz: string | undefined | null) => {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const getDetectedTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

interface GeneralSectionProps {
  userRole: MembershipRole | null
  initialData?: StudioSettingsData | null
  view?: 'all' | 'general' | 'scheduling'
  className?: string
}

export default function GeneralSection({
  userRole,
  initialData,
  view = 'all',
  className,
}: GeneralSectionProps) {
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<StudioSettingsData | null>(null)
  const containerClassName = className ?? 'pl-10 pr-10 pt-6 pb-6 space-y-6'

  // Form state
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [timezone, setTimezone] = React.useState('UTC')
  // Saving states
  const [savingContact, setSavingContact] = React.useState(false)
  const [savingLocation, setSavingLocation] = React.useState(false)

  // Track original values to detect changes
  const originalValues = React.useRef({
    contact_email: '',
    contact_phone: '',
    timezone: 'UTC',
  })

  const showInformation = view === 'all' || view === 'general'
  const showTimezone = showInformation
  const detectedTimezone = React.useMemo(() => {
    const tz = getDetectedTimezone()
    return isValidTimezone(tz) ? tz : 'UTC'
  }, [])
  const timezoneOptions = React.useMemo(() => {
    if (detectedTimezone && !TIMEZONES.some((option) => option.value === detectedTimezone)) {
      return [{ value: detectedTimezone, label: detectedTimezone }, ...TIMEZONES]
    }
    return TIMEZONES
  }, [detectedTimezone])

  // Load initial data
  React.useEffect(() => {
    async function fetchData() {
      setLoading(true)

      // Use provided initial data if available (avoids double fetch on page load)
      if (initialData) {
        const defaultTimezone =
          initialData.studio.timezone && isValidTimezone(initialData.studio.timezone)
            ? initialData.studio.timezone
            : detectedTimezone
        setData(initialData)
        setContactEmail(initialData.studio.contact_email || '')
        setContactPhone(formatPhoneInput(initialData.studio.contact_phone || ''))
        setTimezone(defaultTimezone)
        originalValues.current = {
          contact_email: initialData.studio.contact_email || '',
          contact_phone: formatPhoneInput(initialData.studio.contact_phone || ''),
          timezone: defaultTimezone,
        }
        setLoading(false)
        return
      }

      const result = await getStudioSettings()
      if ('error' in result) {
        toast.error(result.message)
        setLoading(false)
        return
      }
      setData(result)
      const defaultTimezone =
        result.studio.timezone && isValidTimezone(result.studio.timezone)
          ? result.studio.timezone
          : detectedTimezone
      setContactEmail(result.studio.contact_email || '')
      setContactPhone(formatPhoneInput(result.studio.contact_phone || ''))
      setTimezone(defaultTimezone)
      originalValues.current = {
        contact_email: result.studio.contact_email || '',
        contact_phone: formatPhoneInput(result.studio.contact_phone || ''),
        timezone: defaultTimezone,
      }
      setLoading(false)
    }
    fetchData()
  }, [initialData, detectedTimezone])

  const hasContactChanges =
    showInformation &&
    (contactEmail.trim() !== originalValues.current.contact_email ||
      contactPhone.trim() !== originalValues.current.contact_phone)

  const hasLocationChanges =
    showInformation &&
    showTimezone &&
    timezone !== originalValues.current.timezone

  const handleTimezoneChange = (value: string) => {
    setTimezone(value)
  }

  const handleSaveContact = async () => {
    if (!hasContactChanges) return

    const trimmedEmail = contactEmail.trim()
    const trimmedPhone = contactPhone.trim()

    if (trimmedEmail) {
      if (trimmedEmail.length > 254) {
        toast.error('Email cannot exceed 254 characters')
        return
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail)) {
        toast.error('Please enter a valid email')
        return
      }
    }

    if (trimmedPhone) {
      if (trimmedPhone.length > 32) {
        toast.error('Phone cannot exceed 32 characters')
        return
      }
      if (!/^[\d+\-\s().]+$/.test(trimmedPhone)) {
        toast.error('Phone contains invalid characters')
        return
      }
      const digitCount = (trimmedPhone.match(/\d/g) || []).length
      if (digitCount < 7) {
        toast.error('Phone must include at least 7 digits')
        return
      }
    }

    setSavingContact(true)
    try {
      const result = await updateStudio({
        contact_email: trimmedEmail || null,
        contact_phone: trimmedPhone || null,
      })

      if ('error' in result) {
        toast.error(result.message)
        setSavingContact(false)
        return
      }

      originalValues.current.contact_email = trimmedEmail
      originalValues.current.contact_phone = trimmedPhone

      if (data) {
        setData({
          ...data,
          studio: {
            ...data.studio,
            contact_email: trimmedEmail || null,
            contact_phone: trimmedPhone || null,
          },
        })
      }

      toast.success('Contact info saved')
    } catch (error) {
      toast.error('Failed to save contact info')
    } finally {
      setSavingContact(false)
    }
  }

  const handleCancelContact = () => {
    setContactEmail(originalValues.current.contact_email)
    setContactPhone(originalValues.current.contact_phone)
  }

  // Handle save location section
  const handleSaveLocation = async () => {
    if (!hasLocationChanges) return

    if (!timezone || !isValidTimezone(timezone)) {
      toast.error('Please select a valid timezone')
      return
    }

    setSavingLocation(true)
    try {
      const result = await updateStudio({
        timezone,
      })

      if ('error' in result) {
        toast.error(result.message)
        setSavingLocation(false)
        return
      }

      originalValues.current.timezone = timezone

      if (data) {
        setData({
          ...data,
          studio: {
            ...data.studio,
            timezone,
          },
        })
      }

      toast.success('Timezone saved successfully')
    } catch (error) {
      toast.error('Failed to save timezone')
    } finally {
      setSavingLocation(false)
    }
  }

  // Handle cancel location section
  const handleCancelLocation = () => {
    setTimezone(originalValues.current.timezone)
  }


  const isOwnerOrAdmin = data?.isOwnerOrAdmin ?? false

  if (loading) {
    return (
      <div className={cn(containerClassName)}>
        <Card className="shadow-none">
          <CardContent className="p-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-64 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex-1 max-w-md">
                  <div className="h-10 w-full bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={cn(containerClassName)}>
        <p className="text-sm text-muted-foreground">Failed to load studio settings</p>
      </div>
    )
  }

  return (
    <div className={cn(containerClassName)}>
      {!isOwnerOrAdmin && (
        <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          You can view studio info. Admins can update branding and timezone.
        </div>
      )}
      {showInformation && (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <div className="grid grid-cols-[200px_1fr] items-center gap-4 px-5 py-3 border-b">
              <div>
                <label htmlFor="studio-email" className="text-sm font-medium">
                  Email
                  <span className="block text-xs text-muted-foreground">Used for studio contact.</span>
                </label>
              </div>
              <div className="max-w-md">
                <Input
                  id="studio-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="studio@email.com"
                  maxLength={254}
                  disabled={savingContact || !isOwnerOrAdmin}
                  className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] items-center gap-4 px-5 py-3 border-b">
              <div>
                <label htmlFor="studio-phone" className="text-sm font-medium">
                  Phone
                  <span className="block text-xs text-muted-foreground">Used for studio contact.</span>
                </label>
              </div>
              <div className="max-w-md">
                <Input
                  id="studio-phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(formatPhoneInput(e.target.value))}
                  placeholder="+1 (555) 123-4567"
                  maxLength={32}
                  disabled={savingContact || !isOwnerOrAdmin}
                  className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                />
              </div>
            </div>

            {isOwnerOrAdmin && (
              <div className="flex justify-end gap-2 px-5 py-3">
                <Button
                  variant="outline"
                  onClick={handleCancelContact}
                  disabled={!hasContactChanges || savingContact}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveContact} disabled={!hasContactChanges || savingContact}>
                  {savingContact ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showInformation && (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <div className="grid grid-cols-[200px_1fr] items-center gap-4 px-5 py-3 border-b">
              <div>
                <label htmlFor="studio-timezone" className="text-sm font-medium">
                  Studio Timezone
                  <span className="block text-xs text-muted-foreground">
                  Controls how session times are shown.
                  </span>
                </label>
              </div>
              <div className="max-w-md">
                <Select
                  value={timezone}
                  onValueChange={handleTimezoneChange}
                  disabled={savingLocation || !isOwnerOrAdmin}
                >
                  <SelectTrigger id="studio-timezone" className={!isOwnerOrAdmin ? 'bg-muted' : ''}>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isOwnerOrAdmin && (
              <div className="flex justify-end gap-2 px-5 py-3">
                <Button
                  variant="outline"
                  onClick={handleCancelLocation}
                  disabled={!hasLocationChanges || savingLocation}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveLocation} disabled={!hasLocationChanges || savingLocation}>
                  {savingLocation ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
