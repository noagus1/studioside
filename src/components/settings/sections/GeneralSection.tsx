'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { getStudioSettings, type StudioSettingsData } from '@/actions/getStudioSettings'
import { updateStudio } from '@/actions/updateStudio'
import { updateStudioAddress } from '@/actions/updateStudioAddress'
import type { MembershipRole } from '@/types/db'
import { cn } from '@/lib/utils'

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

type AddressSuggestion = {
  id: string
  label: string
  street: string
  city: string
  state: string
  postal_code: string
  country: string
  lat?: number
  lng?: number
}

const MOCK_ADDRESS_SUGGESTIONS: AddressSuggestion[] = [
  {
    id: 'address-1',
    label: '128 2nd Ave N, Nashville, TN 37201, US',
    street: '128 2nd Ave N',
    city: 'Nashville',
    state: 'TN',
    postal_code: '37201',
    country: 'US',
    lat: 36.1632,
    lng: -86.7789,
  },
  {
    id: 'address-2',
    label: '311 Broadway, New York, NY 10007, US',
    street: '311 Broadway',
    city: 'New York',
    state: 'NY',
    postal_code: '10007',
    country: 'US',
    lat: 40.7163,
    lng: -74.0066,
  },
  {
    id: 'address-3',
    label: '1740 W 2nd Ave, Vancouver, BC V6J 1H6, CA',
    street: '1740 W 2nd Ave',
    city: 'Vancouver',
    state: 'BC',
    postal_code: 'V6J 1H6',
    country: 'CA',
    lat: 49.2684,
    lng: -123.1689,
  },
  {
    id: 'address-4',
    label: '4-1-1 Shibaura, Minato City, Tokyo 108-0023, JP',
    street: '4-1-1 Shibaura',
    city: 'Tokyo',
    state: 'Tokyo',
    postal_code: '108-0023',
    country: 'JP',
    lat: 35.6412,
    lng: 139.7546,
  },
]

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
  const emailInputRef = React.useRef<HTMLInputElement>(null)

  // Form state
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [timezone, setTimezone] = React.useState('UTC')
  const [isEditingContact, setIsEditingContact] = React.useState(false)
  // Saving states
  const [savingContact, setSavingContact] = React.useState(false)
  const [savingAddress, setSavingAddress] = React.useState(false)

  const [isAddressModalOpen, setIsAddressModalOpen] = React.useState(false)
  const [addressQuery, setAddressQuery] = React.useState('')

  // Track original values to detect changes
  const originalValues = React.useRef({
    contact_email: '',
    contact_phone: '',
  })

  const showInformation = view === 'all' || view === 'general'
  const detectedTimezone = React.useMemo(() => {
    const tz = getDetectedTimezone()
    return isValidTimezone(tz) ? tz : 'UTC'
  }, [])

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
      }
      setLoading(false)
    }
    fetchData()
  }, [initialData, detectedTimezone])

  const hasContactChanges =
    showInformation &&
    (contactEmail.trim() !== originalValues.current.contact_email ||
      contactPhone.trim() !== originalValues.current.contact_phone)

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
      setIsEditingContact(false)
    } catch (error) {
      toast.error('Failed to save contact info')
    } finally {
      setSavingContact(false)
    }
  }

  const handleCancelContact = () => {
    setContactEmail(originalValues.current.contact_email)
    setContactPhone(originalValues.current.contact_phone)
    setIsEditingContact(false)
  }

  const handleEditContact = () => {
    setIsEditingContact(true)
    emailInputRef.current?.focus()
    emailInputRef.current?.select()
  }

  const filteredAddressSuggestions = React.useMemo(() => {
    const query = addressQuery.trim().toLowerCase()
    if (!query) return MOCK_ADDRESS_SUGGESTIONS
    return MOCK_ADDRESS_SUGGESTIONS.filter((suggestion) =>
      suggestion.label.toLowerCase().includes(query)
    )
  }, [addressQuery])

  const addressLines = React.useMemo(() => {
    const street = data?.studio.street?.trim()
    const city = data?.studio.city?.trim()
    const state = data?.studio.state?.trim()
    const country = data?.studio.country?.trim()
    const line1 = street || 'Not set'
    const line2Parts = [city, state, country].filter(Boolean)
    const line2 = line2Parts.length ? line2Parts.join(', ') : 'City, State/Province, Country'
    return { line1, line2 }
  }, [data])

  const handleAddressModalChange = (open: boolean) => {
    setIsAddressModalOpen(open)
    if (open) {
      setAddressQuery('')
    }
  }

  const handleSelectAddress = async (selection: AddressSuggestion) => {
    if (!isOwnerOrAdmin) return
    setSavingAddress(true)
    try {
      const result = await updateStudioAddress({
        address: {
          street: selection.street,
          city: selection.city,
          state: selection.state,
          postal_code: selection.postal_code,
          country: selection.country,
        },
        lat: selection.lat,
        lng: selection.lng,
      })

      if ('error' in result) {
        toast.error(result.message)
        return
      }

      if (data) {
        setData({
          ...data,
          studio: {
            ...data.studio,
            street: result.address.street,
            city: result.address.city,
            state: result.address.state,
            postal_code: result.address.postal_code,
            country: result.address.country,
            timezone: result.timezone,
          },
        })
      }

      setTimezone(result.timezone || detectedTimezone)
      toast.success('Studio location updated')
      setIsAddressModalOpen(false)
    } catch (error) {
      toast.error('Failed to update studio location')
    } finally {
      setSavingAddress(false)
    }
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
          You can view studio info. Admins can update branding and location.
        </div>
      )}
      {showInformation && (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <div className="grid grid-cols-[200px_1fr] items-center gap-4 px-5 py-3 border-b-0">
              <div>
                <label htmlFor="studio-email" className="text-sm font-medium">
                  Contact
                  <span className="block text-xs text-muted-foreground">
                  Primary contact details
                  </span>
                </label>
              </div>
              <div className="flex items-start justify-between gap-3">
                {isEditingContact ? (
                  <div className="max-w-md flex-1 space-y-3">
                    <Input
                      id="studio-email"
                      type="email"
                      ref={emailInputRef}
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="studio@email.com"
                      maxLength={254}
                      disabled={savingContact || !isOwnerOrAdmin}
                      className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                    />
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
                ) : (
                  <div className="max-w-md space-y-1">
                    <p className="text-sm text-foreground">
                      {contactEmail.trim() || 'Not set'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contactPhone.trim() || 'Not set'}
                    </p>
                  </div>
                )}
                {isOwnerOrAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEditContact}
                    disabled={savingContact}
                    className="h-9"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {isOwnerOrAdmin && isEditingContact && (
              <div className="flex justify-end gap-2 px-5 py-3">
                <Button
                  variant="outline"
                  onClick={handleCancelContact}
                  disabled={savingContact}
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
            <div className="grid grid-cols-[200px_1fr] items-center gap-4 px-5 py-3">
              <div>
                <label className="text-sm font-medium">
                  Address
                  <span className="block text-xs text-muted-foreground">
                  Primary studio address
                  </span>
                </label>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="max-w-md space-y-1">
                  <p className="text-sm text-foreground">{addressLines.line1}</p>
                  <p className="text-sm text-muted-foreground">{addressLines.line2}</p>
                </div>
                <Dialog open={isAddressModalOpen} onOpenChange={handleAddressModalChange}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddressModalChange(true)}
                    disabled={!isOwnerOrAdmin || savingAddress}
                  >
                    Edit
                  </Button>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Edit Address</DialogTitle>
                      <DialogDescription>
                        Search for the studio address. Selecting a result updates immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Input
                        value={addressQuery}
                        onChange={(event) => setAddressQuery(event.target.value)}
                        placeholder="Search address"
                        disabled={savingAddress}
                      />
                      <div className="max-h-64 overflow-auto rounded-lg border border-border/70">
                        {filteredAddressSuggestions.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No matches yet. Try another search.
                          </div>
                        ) : (
                          filteredAddressSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              onClick={() => handleSelectAddress(suggestion)}
                              disabled={savingAddress}
                              className="flex w-full flex-col gap-1 border-b border-border/70 px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 last:border-b-0"
                            >
                              <span className="font-medium text-foreground">{suggestion.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {suggestion.city}, {suggestion.state} {suggestion.postal_code}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
