'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import { createRoom, updateRoom, type Room } from '../../../../app/(app)/settings/rooms/actions'
import type { BillingStyle } from '@/types/db'
import { getStudioSettings } from '@/actions/getStudioSettings'
import type { MembershipRole } from '@/types/db'
import type { Studio } from '@/types/studio'

interface RoomDetailDrawerProps {
  room: Room | null // null for new room
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoomSaved: (room: Room) => void
  userRole: MembershipRole | null
}

export function RoomDetailDrawer({
  room,
  open,
  onOpenChange,
  onRoomSaved,
  userRole,
}: RoomDetailDrawerProps) {
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin'
  const isAddMode = room === null

  // Form state
  const [name, setName] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)
  const [useStudioPricing, setUseStudioPricing] = React.useState(true)
  const [billingStyle, setBillingStyle] = React.useState<BillingStyle | null>(null)
  const [rate, setRate] = React.useState<string>('')
  const [overtimeRate, setOvertimeRate] = React.useState<string>('')
  const [description, setDescription] = React.useState<string>('')
  const [showDescription, setShowDescription] = React.useState(false)

  // Studio pricing state
  const [studioPricing, setStudioPricing] = React.useState<Studio | null>(null)
  const [loadingStudioPricing, setLoadingStudioPricing] = React.useState(false)

  // Saving state
  const [saving, setSaving] = React.useState(false)

  // Load studio pricing when drawer opens
  React.useEffect(() => {
    if (open && useStudioPricing) {
      loadStudioPricing()
    }
  }, [open, useStudioPricing])

  // Reset form when room changes or drawer opens/closes
  React.useEffect(() => {
    if (room) {
      // Edit mode: populate form with room data
      setName(room.name)
      setIsActive(room.is_active)
      setUseStudioPricing(room.use_studio_pricing)
      setBillingStyle(room.billing_style)
      setRate(room.rate?.toString() || '')
      setOvertimeRate(room.overtime_rate?.toString() || '')
      setDescription(room.description || '')
      setShowDescription(!!room.description)
    } else if (open && isAddMode) {
      // Add mode: reset form to defaults
      setName('')
      setIsActive(true)
      setUseStudioPricing(true)
      setBillingStyle(null)
      setRate('')
      setOvertimeRate('')
      setDescription('')
      setShowDescription(false)
    }
  }, [room, open, isAddMode])

  const loadStudioPricing = async () => {
    setLoadingStudioPricing(true)
    try {
      const result = await getStudioSettings()
      if ('error' in result) {
        toast.error(result.message)
        return
      }
      setStudioPricing(result.studio)
    } catch (error) {
      toast.error('Failed to load studio pricing')
      console.error(error)
    } finally {
      setLoadingStudioPricing(false)
    }
  }

  const handleSave = async () => {
    // Validate name
    if (!name.trim()) {
      toast.error('Room name is required')
      return
    }

    // Validate custom pricing if not using studio pricing
    if (!useStudioPricing) {
      if (!billingStyle) {
        toast.error('Billing style is required when using custom pricing')
        return
      }
      if (!rate || parseFloat(rate) <= 0) {
        toast.error('Rate must be a positive number')
        return
      }
    }

    setSaving(true)

    try {
      const roomData = {
        name: name.trim(),
        description: description.trim() || null,
        is_active: isActive,
        use_studio_pricing: useStudioPricing,
        billing_style: useStudioPricing ? null : billingStyle,
        rate: useStudioPricing ? null : (rate ? parseFloat(rate) : null),
        overtime_rate: useStudioPricing ? null : (overtimeRate ? parseFloat(overtimeRate) : null),
      }

      if (isAddMode) {
        // Create new room - first create with basic info, then update with pricing
        const result = await createRoom({ name: roomData.name, description: roomData.description })
        if ('success' in result && result.success) {
          // Update the created room with all settings including pricing
          const updateResult = await updateRoom(result.room.id, {
            is_active: roomData.is_active,
            use_studio_pricing: roomData.use_studio_pricing,
            billing_style: roomData.billing_style,
            rate: roomData.rate,
            overtime_rate: roomData.overtime_rate,
          })
          if ('success' in updateResult && updateResult.success) {
            toast.success('Room created successfully')
            onRoomSaved(updateResult.room)
            onOpenChange(false)
          } else {
            toast.error('error' in updateResult ? updateResult.message : 'Failed to update room settings')
          }
        } else {
          toast.error('error' in result ? result.message : 'Failed to create room')
        }
      } else {
        // Update existing room
        if (!room) return
        const result = await updateRoom(room.id, roomData)
        if ('success' in result && result.success) {
          toast.success('Room updated successfully')
          onRoomSaved(result.room)
          onOpenChange(false)
        } else {
          toast.error('error' in result ? result.message : 'Failed to update room')
        }
      }
    } catch (error) {
      toast.error('Failed to save room')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  // Format currency
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '$0.00'
    return `$${value.toFixed(2)}`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isAddMode ? 'Add Room' : 'Edit Room'}</SheetTitle>
          <SheetDescription>
            {isAddMode
              ? 'Configure the space available for sessions.'
              : 'Update room settings and pricing.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Required Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Required</h3>
            <Card className="shadow-none">
              <CardContent className="p-0">
                {/* Name */}
                <div className="flex items-center justify-between py-4 px-6 border-b">
                  <div className="flex-1">
                    <label htmlFor="room-name" className="text-sm font-medium">
                      Name
                    </label>
                    <p className="text-xs text-muted-foreground mt-1 mr-4">
                      Room name for identification
                    </p>
                  </div>
                  <div className="flex-1 max-w-md">
                    <Input
                      id="room-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Room name"
                      disabled={saving || !isOwnerOrAdmin}
                      className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                    />
                  </div>
                </div>

                {/* Active */}
                <div className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
                  <div className="flex-1">
                    <label htmlFor="room-active" className="text-sm font-medium">
                      Active
                    </label>
                    <p className="text-xs text-muted-foreground mt-1 mr-4">
                      Whether this room is available for scheduling
                    </p>
                  </div>
                  <div className="flex-1 max-w-md flex justify-end">
                    {isOwnerOrAdmin ? (
                      <Switch
                        id="room-active"
                        checked={isActive}
                        onCheckedChange={setIsActive}
                        disabled={saving}
                      />
                    ) : (
                      <Switch checked={isActive} disabled className="opacity-50" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Pricing</h3>
            <Card className="shadow-none">
              <CardContent className="p-4 space-y-4">
                {/* Use Studio Pricing Option */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="use-studio-pricing"
                      checked={useStudioPricing}
                      onChange={() => setUseStudioPricing(true)}
                      disabled={saving || !isOwnerOrAdmin}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor="use-studio-pricing"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Use studio pricing
                    </label>
                  </div>
                  {useStudioPricing && (
                    <div className="ml-6">
                      {loadingStudioPricing ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading studio pricing...
                        </div>
                      ) : studioPricing ? (
                        <Card className="bg-muted/50 border-dashed">
                          <CardContent className="p-4 space-y-2">
                            <div className="text-sm font-medium">Studio pricing</div>
                            {studioPricing.billing_style && studioPricing.base_rate !== null ? (
                              <>
                                <div className="text-sm text-muted-foreground">
                                  Billing style:{' '}
                                  <span className="font-medium">
                                    {studioPricing.billing_style === 'hourly'
                                      ? 'Hourly'
                                      : 'Flat session'}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Rate:{' '}
                                  <span className="font-medium">
                                    {formatCurrency(studioPricing.base_rate)}{' '}
                                    {studioPricing.billing_style === 'hourly'
                                      ? 'per hour'
                                      : 'per session'}
                                  </span>
                                </div>
                                {studioPricing.default_overtime_rate && (
                                  <div className="text-sm text-muted-foreground">
                                    Overtime:{' '}
                                    <span className="font-medium">
                                      {formatCurrency(studioPricing.default_overtime_rate)} per hour
                                    </span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                Studio pricing not configured
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Failed to load studio pricing
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Set Custom Pricing Option */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="set-custom-pricing"
                      checked={!useStudioPricing}
                      onChange={() => setUseStudioPricing(false)}
                      disabled={saving || !isOwnerOrAdmin}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor="set-custom-pricing"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Set custom pricing
                    </label>
                  </div>
                  {!useStudioPricing && (
                    <div className="ml-6 space-y-4">
                      {/* Billing Style */}
                      <div>
                        <label htmlFor="billing-style" className="text-sm font-medium block mb-2">
                          Billing style
                        </label>
                        <Select
                          value={billingStyle || ''}
                          onValueChange={(value) => setBillingStyle(value as BillingStyle)}
                          disabled={saving || !isOwnerOrAdmin}
                        >
                          <SelectTrigger id="billing-style" className="w-full">
                            <SelectValue placeholder="Select billing style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="flat_session">Flat session</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Rate */}
                      <div>
                        <label htmlFor="rate" className="text-sm font-medium block mb-2">
                          Rate
                        </label>
                        <div
                          className={`flex w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-within:outline-none focus-within:ring-1 focus-within:ring-ring md:text-sm ${
                            !isOwnerOrAdmin ? 'bg-muted' : ''
                          }`}
                        >
                          <span className="mr-2 text-muted-foreground">$</span>
                          <Input
                            id="rate"
                            type="number"
                            step="0.01"
                            min="0"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            placeholder="0.00"
                            disabled={saving || !isOwnerOrAdmin}
                            className="h-9 flex-1 border-0 bg-transparent px-0 py-0 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {billingStyle === 'hourly' ? 'Per hour' : 'Per session'}
                        </p>
                      </div>

                      {/* Overtime Rate */}
                      <div>
                        <label htmlFor="overtime-rate" className="text-sm font-medium block mb-2">
                          Overtime rate <span className="text-muted-foreground">(optional)</span>
                        </label>
                        <div
                          className={`flex w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-within:outline-none focus-within:ring-1 focus-within:ring-ring md:text-sm ${
                            !isOwnerOrAdmin ? 'bg-muted' : ''
                          }`}
                        >
                          <span className="mr-2 text-muted-foreground">$</span>
                          <Input
                            id="overtime-rate"
                            type="number"
                            step="0.01"
                            min="0"
                            value={overtimeRate}
                            onChange={(e) => setOvertimeRate(e.target.value)}
                            placeholder="0.00"
                            disabled={saving || !isOwnerOrAdmin}
                            className="h-9 flex-1 border-0 bg-transparent px-0 py-0 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Per hour</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Optional Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Optional</h3>
              {!showDescription && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDescription(true)}
                  disabled={saving || !isOwnerOrAdmin}
                >
                  Add details
                </Button>
              )}
            </div>
            {showDescription && (
              <Card className="shadow-none">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
                    <div className="flex-1">
                      <label htmlFor="room-description" className="text-sm font-medium">
                        Description
                      </label>
                      <p className="text-xs text-muted-foreground mt-1 mr-4">
                        Additional details about this room
                      </p>
                    </div>
                    <div className="flex-1 max-w-md">
                      <Textarea
                        id="room-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Room description"
                        disabled={saving || !isOwnerOrAdmin}
                        className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          {isOwnerOrAdmin && (
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

