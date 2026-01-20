'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from '@/components/ui/card'
import { getStudioSettings } from '@/actions/getStudioSettings'
import { getStudioDefaults, updateStudioDefaults } from '@/actions/studioDefaults'
import { updateStudio } from '@/actions/updateStudio'
import type { MembershipRole } from '@/types/db'

interface PreferencesSectionProps {
  userRole: MembershipRole | null
}

export default function PreferencesSection({ userRole }: PreferencesSectionProps) {
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin'

  // Studio settings state
  const [loadingStudio, setLoadingStudio] = React.useState(true)
  const [studio, setStudio] = React.useState<any>(null)
  const [defaultSessionLength, setDefaultSessionLength] = React.useState<string>('')
  const [bufferMinutes, setBufferMinutes] = React.useState<string>('')
  const [sessionOvertimeRate, setSessionOvertimeRate] = React.useState<string>('')
  const [billingStyle, setBillingStyle] = React.useState<'hourly' | 'flat_session' | ''>('')
  const [baseRate, setBaseRate] = React.useState<string>('')
  const [pricingOvertimeRate, setPricingOvertimeRate] = React.useState<string>('')
  const [savingSessionDefaults, setSavingSessionDefaults] = React.useState(false)
  const [savingPricing, setSavingPricing] = React.useState(false)

  // Track original values for session defaults
  const originalSessionDefaults = React.useRef({
    defaultSessionLength: '',
    bufferMinutes: '',
    sessionOvertimeRate: '',
  })

  const originalPricing = React.useRef({
    billingStyle: '' as '' | 'hourly' | 'flat_session',
    baseRate: '',
    pricingOvertimeRate: '',
  })

  // Load studio settings
  React.useEffect(() => {
    async function loadStudio() {
      setLoadingStudio(true)
      try {
        const result = await getStudioSettings()
        if ('error' in result) {
          toast.error(result.message)
          return
        }
        setStudio(result.studio)
        const overtime = result.studio.default_overtime_rate?.toString() || ''
        setSessionOvertimeRate(overtime)
        setBillingStyle(result.studio.billing_style || '')
        setBaseRate(result.studio.base_rate?.toString() || '')
        setPricingOvertimeRate(overtime)
        originalPricing.current = {
          billingStyle: result.studio.billing_style || '',
          baseRate: result.studio.base_rate?.toString() || '',
          pricingOvertimeRate: overtime,
        }
      } catch (error) {
        toast.error('Failed to load studio settings')
        console.error(error)
      } finally {
        setLoadingStudio(false)
      }
    }
    loadStudio()
  }, [])

  React.useEffect(() => {
    async function loadDefaults() {
      try {
        const result = await getStudioDefaults()
        if ('error' in result) {
          toast.error(result.message)
          return
        }
        setDefaultSessionLength(result.defaults.default_session_length_hours?.toString() || '')
        setBufferMinutes(result.defaults.default_buffer_minutes?.toString() || '0')
        originalSessionDefaults.current = {
          defaultSessionLength: result.defaults.default_session_length_hours?.toString() || '',
          bufferMinutes: result.defaults.default_buffer_minutes?.toString() || '0',
          sessionOvertimeRate: sessionOvertimeRate,
        }
      } catch (error) {
        toast.error('Failed to load session defaults')
        console.error(error)
      }
    }
    loadDefaults()
  }, [sessionOvertimeRate])

  // Check if session defaults have changed
  const hasSessionDefaultsChanges =
    defaultSessionLength !== originalSessionDefaults.current.defaultSessionLength ||
    bufferMinutes !== originalSessionDefaults.current.bufferMinutes ||
    sessionOvertimeRate !== originalSessionDefaults.current.sessionOvertimeRate

  const hasPricingChanges =
    billingStyle !== originalPricing.current.billingStyle ||
    baseRate !== originalPricing.current.baseRate ||
    pricingOvertimeRate !== originalPricing.current.pricingOvertimeRate

  const formatHours = (value: string) => {
    if (!value) return 'Unset'
    return `${value}h`
  }

  const formatMinutes = (value: string) => {
    if (!value) return '0m'
    const num = Number(value)
    if (Number.isNaN(num)) return '0m'
    return `${num}m`
  }

  const formatRate = (value: string) => {
    if (!value) return '$0.00'
    const num = Number(value)
    if (Number.isNaN(num)) return '$0.00'
    return `$${num.toFixed(2)}`
  }

  const sessionSummary = [
    formatHours(defaultSessionLength),
    `${formatMinutes(bufferMinutes)} buffer`,
    `${formatRate(sessionOvertimeRate)} OT`,
  ].join(' • ')

  const billingSummary = [
    billingStyle === 'flat_session'
      ? 'Flat session'
      : billingStyle === 'hourly'
        ? 'Hourly'
        : 'Billing unset',
    `${formatRate(baseRate)} base`,
    `${formatRate(pricingOvertimeRate)} OT`,
  ].join(' • ')

  // Handle save session defaults
  const handleSaveSessionDefaults = async () => {
    if (!hasSessionDefaultsChanges) return

    setSavingSessionDefaults(true)
    try {
      const updateData: {
        default_session_length_hours?: number
        default_buffer_minutes?: number
      } = {}

      if (defaultSessionLength !== originalSessionDefaults.current.defaultSessionLength) {
        if (defaultSessionLength.trim()) {
          const hours = parseInt(defaultSessionLength, 10)
          if (isNaN(hours) || hours < 1 || hours > 24) {
            toast.error('Session length must be between 1 and 24 hours')
            setSavingSessionDefaults(false)
            return
          }
          updateData.default_session_length_hours = hours
        }
      }

      if (bufferMinutes !== originalSessionDefaults.current.bufferMinutes) {
        const minutes = parseInt(bufferMinutes, 10)
        if (isNaN(minutes) || minutes < 0 || minutes > 60) {
          toast.error('Buffer minutes must be between 0 and 60')
          setSavingSessionDefaults(false)
          return
        }
        updateData.default_buffer_minutes = minutes
      }

      if (Object.keys(updateData).length === 0) {
        setSavingSessionDefaults(false)
        return
      }
      const result = await updateStudioDefaults(updateData)

      if ('error' in result) {
        toast.error(result.message)
        setSavingSessionDefaults(false)
        return
      }

      // Update original values
      originalSessionDefaults.current = {
        defaultSessionLength: defaultSessionLength,
        sessionOvertimeRate: sessionOvertimeRate,
        bufferMinutes: bufferMinutes,
      }

      // Reload defaults to reflect saved state
      const defaultsResult = await getStudioDefaults()
      if (!('error' in defaultsResult)) {
        setDefaultSessionLength(defaultsResult.defaults.default_session_length_hours?.toString() || '')
        setBufferMinutes(defaultsResult.defaults.default_buffer_minutes?.toString() || '0')
        originalSessionDefaults.current = {
          defaultSessionLength: defaultsResult.defaults.default_session_length_hours?.toString() || '',
          bufferMinutes: defaultsResult.defaults.default_buffer_minutes?.toString() || '0',
          sessionOvertimeRate: sessionOvertimeRate,
        }
      }

      toast.success('Session defaults saved successfully')
    } catch (error) {
      toast.error('Failed to save session defaults')
      console.error(error)
    } finally {
      setSavingSessionDefaults(false)
    }
  }

  // Handle cancel session defaults
  const handleCancelSessionDefaults = () => {
    setDefaultSessionLength(originalSessionDefaults.current.defaultSessionLength)
    setBufferMinutes(originalSessionDefaults.current.bufferMinutes)
    setSessionOvertimeRate(originalSessionDefaults.current.sessionOvertimeRate)
  }

  // Handle save pricing section
  const handleSavePricing = async () => {
    if (!hasPricingChanges) return

    setSavingPricing(true)
    try {
      const updateData: {
        billing_style?: 'hourly' | 'flat_session' | null
        base_rate?: number | null
        default_overtime_rate?: number | null
      } = {}

      if (billingStyle !== originalPricing.current.billingStyle) {
        updateData.billing_style = billingStyle || null
      }

      if (baseRate !== originalPricing.current.baseRate) {
        updateData.base_rate = baseRate ? parseFloat(baseRate) : null
      }

      if (pricingOvertimeRate !== originalPricing.current.pricingOvertimeRate) {
        updateData.default_overtime_rate = pricingOvertimeRate ? parseFloat(pricingOvertimeRate) : null
      }

      const result = await updateStudio(updateData)

      if ('error' in result) {
        toast.error(result.message)
        setSavingPricing(false)
        return
      }

      originalPricing.current = {
        billingStyle: billingStyle,
        baseRate: baseRate,
        pricingOvertimeRate: pricingOvertimeRate,
      }

      // Refresh studio data
      const studioResult = await getStudioSettings()
      if (!('error' in studioResult)) {
        setStudio(studioResult.studio)
      }

      toast.success('Pricing saved successfully')
    } catch (error) {
      toast.error('Failed to save pricing')
    } finally {
      setSavingPricing(false)
    }
  }

  // Handle cancel pricing section
  const handleCancelPricing = () => {
    setBillingStyle(originalPricing.current.billingStyle)
    setBaseRate(originalPricing.current.baseRate)
    setPricingOvertimeRate(originalPricing.current.pricingOvertimeRate)
  }

  if (loadingStudio) {
    return (
      <div className="pl-10 pr-10 pt-6 pb-6 space-y-6">
        <Card className="shadow-none">
          <CardContent className="p-0">
            {[1, 2, 3].map((i) => (
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

  return (
    <div className="pl-10 pr-10 pt-6 pb-6 space-y-6">
      {!isOwnerOrAdmin && (
        <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          View only. Admins can update defaults and pricing.
        </div>
      )}

      {/* Summary strip */}
      <Card className="shadow-none border-dashed">
        <CardContent className="p-4 flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="font-medium text-foreground">Session defaults</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{sessionSummary}</div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="font-medium text-foreground">Billing defaults</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{billingSummary}</div>
          </div>
        </CardContent>
      </Card>

      {/* Session defaults card */}
      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <div>
              <h3 className="text-lg font-medium">Session defaults</h3>
              <p className="text-xs text-muted-foreground">
                Applied when creating new sessions and rooms using studio defaults.
              </p>
            </div>
          </div>

          <div className="flex items-start justify-between py-4 px-6 border-t">
            <div className="flex-1">
              <label htmlFor="session-length" className="text-sm font-medium">
                Default session length
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Hours new sessions start with.
              </p>
            </div>
            <div className="flex-1 max-w-md">
              <Select
                value={defaultSessionLength || undefined}
                onValueChange={(value) => setDefaultSessionLength(value || '')}
                disabled={savingSessionDefaults || !isOwnerOrAdmin}
              >
                <SelectTrigger
                  id="session-length"
                  className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                >
                  <SelectValue placeholder="Select hours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="10">10 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start justify-between py-4 px-6 border-t">
            <div className="flex-1">
              <label htmlFor="buffer-minutes" className="text-sm font-medium">
                Buffer between sessions
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Minutes reserved before/after sessions.
              </p>
            </div>
            <div className="flex-1 max-w-md flex items-center gap-2">
              <Input
                id="buffer-minutes"
                type="number"
                min="0"
                max="60"
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(e.target.value)}
                placeholder="0"
                disabled={savingSessionDefaults || !isOwnerOrAdmin}
                className={`${!isOwnerOrAdmin ? 'bg-muted' : ''}`}
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>

          <div className="flex items-start justify-between py-4 px-6 border-t border-b">
            <div className="flex-1">
              <label htmlFor="overtime-rate" className="text-sm font-medium">
                Overtime rate
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Hourly overtime applied to sessions.
              </p>
            </div>
            <div className="flex-1 max-w-md flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                id="overtime-rate"
                type="number"
                min="0"
                step="0.01"
                value={sessionOvertimeRate}
                onChange={(e) => setSessionOvertimeRate(e.target.value)}
                placeholder="0.00"
                disabled={savingSessionDefaults || !isOwnerOrAdmin}
                className={`flex-1 ${!isOwnerOrAdmin ? 'bg-muted' : ''}`}
              />
              <span className="text-sm text-muted-foreground">per hour</span>
            </div>
          </div>

          <div className="px-6 py-3 text-xs text-muted-foreground border-b">
            Preview: {sessionSummary}
          </div>

          {isOwnerOrAdmin && (
            <div className="flex justify-end gap-2 p-6 pt-4">
              <Button
                variant="outline"
                onClick={handleCancelSessionDefaults}
                disabled={!hasSessionDefaultsChanges || savingSessionDefaults}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSessionDefaults}
                disabled={!hasSessionDefaultsChanges || savingSessionDefaults}
              >
                {savingSessionDefaults ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing defaults card */}
      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <div>
              <h3 className="text-lg font-medium">Billing defaults</h3>
              <p className="text-xs text-muted-foreground">
                Pricing applied to rooms that use studio pricing.
              </p>
            </div>
          </div>

          <div className="flex items-start justify-between py-4 px-6 border-t">
            <div className="flex-1">
              <label htmlFor="billing-style" className="text-sm font-medium">
                Billing style
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Choose hourly or flat per session.
              </p>
            </div>
            <div className="flex-1 max-w-md">
              <Select
                value={billingStyle}
                onValueChange={(value) => setBillingStyle(value as 'hourly' | 'flat_session')}
                disabled={savingPricing || !isOwnerOrAdmin}
              >
                <SelectTrigger
                  id="billing-style"
                  className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                >
                  <SelectValue placeholder="Select billing style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="flat_session">Flat session</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start justify-between py-4 px-6 border-t">
            <div className="flex-1">
              <label htmlFor="base-rate" className="text-sm font-medium">
                Base rate
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Default rate used for studio-priced rooms.
              </p>
            </div>
            <div className="flex-1 max-w-md flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                id="base-rate"
                type="number"
                step="0.01"
                min="0"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                placeholder="0.00"
                disabled={savingPricing || !isOwnerOrAdmin}
                className={`flex-1 ${!isOwnerOrAdmin ? 'bg-muted' : ''}`}
              />
              <span className="text-sm text-muted-foreground">
                {billingStyle === 'flat_session' ? 'per session' : 'per hour'}
              </span>
            </div>
          </div>

          <div className="flex items-start justify-between py-4 px-6 border-t border-b">
            <div className="flex-1">
              <label htmlFor="pricing-overtime-rate" className="text-sm font-medium">
                Overtime rate
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Override overtime for studio-priced rooms.
              </p>
            </div>
            <div className="flex-1 max-w-md flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                id="pricing-overtime-rate"
                type="number"
                step="0.01"
                min="0"
                value={pricingOvertimeRate}
                onChange={(e) => setPricingOvertimeRate(e.target.value)}
                placeholder="0.00"
                disabled={savingPricing || !isOwnerOrAdmin}
                className={`flex-1 ${!isOwnerOrAdmin ? 'bg-muted' : ''}`}
              />
              <span className="text-sm text-muted-foreground">per hour</span>
            </div>
          </div>

          <div className="px-6 py-3 text-xs text-muted-foreground border-b">
            Preview: {billingSummary}
          </div>

          {isOwnerOrAdmin && (
            <div className="flex justify-end gap-2 p-6 pt-4">
              <Button
                variant="outline"
                onClick={handleCancelPricing}
                disabled={!hasPricingChanges || savingPricing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePricing}
                disabled={!hasPricingChanges || savingPricing}
              >
                {savingPricing ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
