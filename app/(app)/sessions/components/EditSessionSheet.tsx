'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateSession, deleteSession, getClients, type Client } from '../actions'
import { getRooms, type Room } from '../../settings/rooms/actions'
import type { Session } from '@/types/session'

interface EditSessionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: Session | null
  onSessionUpdated?: () => void
}

const DURATION_PRESETS = [60, 120, 240, 360, 480, 720] // minutes: 1h,2h,4h,6h,8h,12h
const DEFAULT_DURATION_MINUTES = 120

export function EditSessionSheet({ open, onOpenChange, session, onSessionUpdated }: EditSessionSheetProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [rooms, setRooms] = React.useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = React.useState(false)
  const [clients, setClients] = React.useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = React.useState(false)

  // Form state
  const [startDate, setStartDate] = React.useState('')
  const [startTime, setStartTime] = React.useState('')
  const [endTimeInput, setEndTimeInput] = React.useState('')
  const [durationPreset, setDurationPreset] = React.useState<number | 'custom'>(DEFAULT_DURATION_MINUTES)
  const [customDurationMinutes, setCustomDurationMinutes] = React.useState('')
  const [roomId, setRoomId] = React.useState<string>('')
  const [clientId, setClientId] = React.useState<string>('')
  const [engineerId, setEngineerId] = React.useState<string>('')
  const [deleting, setDeleting] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  // Load rooms and clients when sheet opens, and populate form with session data
  React.useEffect(() => {
    if (open && session) {
      loadRooms()
      loadClients()
      
      // Populate form with session data
      const startDateObj = new Date(session.start_time)
      const endDateObj = new Date(session.end_time)

      const durationMinutes = Math.max(
        1,
        Math.round((endDateObj.getTime() - startDateObj.getTime()) / 60000)
      )
      const durationPresetValue = DURATION_PRESETS.includes(durationMinutes)
        ? durationMinutes
        : 'custom'

      setStartDate(startDateObj.toLocaleDateString('en-CA'))
      setStartTime(
        startDateObj.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })
      )
      setDurationPreset(durationPresetValue)
      setCustomDurationMinutes(durationPresetValue === 'custom' ? String(durationMinutes) : '')
      setEndTimeInput('')
      setRoomId(session.room_id || '')
      setClientId(session.client_id || '')
      setEngineerId(session.engineer_id || '')
      setConfirmDelete(false)
    } else if (!open) {
      // Reset form when sheet closes
      setStartDate('')
      setStartTime('')
      setEndTimeInput('')
      setDurationPreset(DEFAULT_DURATION_MINUTES)
      setCustomDurationMinutes('')
      setRoomId('')
      setClientId('')
      setEngineerId('')
      setError(null)
      setConfirmDelete(false)
    }
  }, [open, session])

  // Reset roomId if the selected room no longer exists
  React.useEffect(() => {
    if (rooms.length > 0 && roomId && !rooms.find(r => r.id === roomId)) {
      setRoomId('')
    }
  }, [rooms, roomId])

  const effectiveDurationMinutes = React.useMemo(() => {
    if (durationPreset === 'custom') {
      const parsed = parseInt(customDurationMinutes, 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed
      }
      return DEFAULT_DURATION_MINUTES
    }
    return durationPreset
  }, [customDurationMinutes, durationPreset])

  const startDateTimeIso = React.useMemo(() => {
    if (!startDate || !startTime) return null
    const composed = new Date(`${startDate}T${startTime}`)
    if (isNaN(composed.getTime())) return null
    return composed.toISOString()
  }, [startDate, startTime])

  const endFromDurationIso = React.useMemo(() => {
    if (!startDateTimeIso || !effectiveDurationMinutes) return null
    const start = new Date(startDateTimeIso)
    const end = new Date(start.getTime() + effectiveDurationMinutes * 60000)
    return end.toISOString()
  }, [effectiveDurationMinutes, startDateTimeIso])

  const endFromManualIso = React.useMemo(() => {
    if (!endTimeInput || !startDate || !startDateTimeIso) return null
    const manual = new Date(`${startDate}T${endTimeInput}`)
    if (isNaN(manual.getTime())) return null
    const start = new Date(startDateTimeIso)
    if (manual.getTime() <= start.getTime()) {
      manual.setDate(manual.getDate() + 1)
    }
    return manual.toISOString()
  }, [endTimeInput, startDate, startDateTimeIso])

  const endDateTimeIso = endTimeInput ? endFromManualIso : endFromDurationIso

  const durationSummaryMinutes = React.useMemo(() => {
    if (!startDateTimeIso || !endDateTimeIso) return null
    return Math.max(0, Math.round((new Date(endDateTimeIso).getTime() - new Date(startDateTimeIso).getTime()) / 60000))
  }, [endDateTimeIso, startDateTimeIso])

  const crossesMidnight = React.useMemo(() => {
    if (!startDateTimeIso || !endDateTimeIso) return false
    const start = new Date(startDateTimeIso)
    const end = new Date(endDateTimeIso)
    return start.toDateString() !== end.toDateString()
  }, [endDateTimeIso, startDateTimeIso])

  const formattedStart = startDateTimeIso
    ? new Date(startDateTimeIso).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  const formattedEnd = endDateTimeIso
    ? new Date(endDateTimeIso).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  const durationLabel = React.useMemo(() => {
    if (!durationSummaryMinutes) return '—'
    const hours = Math.floor(durationSummaryMinutes / 60)
    const minutes = durationSummaryMinutes % 60
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  }, [durationSummaryMinutes])

  const derivedStatus = React.useMemo(() => {
    if (session?.status === 'cancelled') return 'Cancelled'
    if (!startDateTimeIso || !endDateTimeIso) return '—'

    const now = new Date()
    const start = new Date(startDateTimeIso)
    const end = new Date(endDateTimeIso)

    if (now < start) return 'Scheduled'
    if (now >= start && now < end) return 'Active'
    return 'Completed'
  }, [endDateTimeIso, session?.status, startDateTimeIso])

  const canSubmit =
    Boolean(startDate && startTime && endDateTimeIso && roomId && clientId) && !loading && !deleting

  const loadRooms = async () => {
    setRoomsLoading(true)
    try {
      const result = await getRooms()
      if ('success' in result && result.success) {
        setRooms(result.rooms)
      } else {
        const errorMessage = 'error' in result ? result.message : 'Failed to load rooms'
        toast.error(errorMessage)
        setRooms([])
      }
    } catch (error) {
      toast.error('Failed to load rooms')
      setRooms([])
      console.error(error)
    } finally {
      setRoomsLoading(false)
    }
  }

  const loadClients = async () => {
    setClientsLoading(true)
    try {
      const result = await getClients()
      if ('success' in result && result.success) {
        setClients(result.clients)
      } else {
        toast.error('error' in result ? result.message : 'Failed to load clients')
      }
    } catch (error) {
      toast.error('Failed to load clients')
      console.error(error)
    } finally {
      setClientsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!session) {
      setError('No session selected')
      setLoading(false)
      return
    }

    // Basic validation
    if (!startDate || !startTime || !endDateTimeIso || !startDateTimeIso) {
      setError('Please fill in date, time, and duration/end time')
      setLoading(false)
      return
    }

    if (!roomId || !clientId) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    // Validate that the selected room still exists
    if (!rooms.find(r => r.id === roomId)) {
      setError('Selected room no longer exists. Please select a different room.')
      setLoading(false)
      return
    }

    // Validate that the selected client still exists
    if (!clients.find(c => c.id === clientId)) {
      setError('Selected client no longer exists. Please select a different client.')
      setLoading(false)
      return
    }

    try {
      const result = await updateSession(session.id, {
        start_at: startDateTimeIso,
        end_at: endDateTimeIso,
        room_id: roomId,
        client_id: clientId,
        engineer_id: engineerId || null,
      })

      if ('error' in result) {
        // Handle specific error types
        if (result.error === 'ROOM_CONFLICT' || result.error === 'ENGINEER_CONFLICT') {
          setError(result.message)
          if (result.conflictDetails) {
            toast.error(
              `Conflict: ${result.conflictDetails.conflicting_client_name || 'Another session'} from ${new Date(result.conflictDetails.conflicting_start_time).toLocaleTimeString()} to ${new Date(result.conflictDetails.conflicting_end_time).toLocaleTimeString()}`
            )
          }
        } else {
          setError(result.message)
          toast.error(result.message)
        }
        setLoading(false)
        return
      }

      // Success
      toast.success('Session updated successfully')
      onOpenChange(false)

      // Call the callback if provided (for auto-refresh)
      if (onSessionUpdated) {
        onSessionUpdated()
      } else {
        // Fallback to router refresh if no callback provided
        router.refresh()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update session'
      setError(errorMessage)
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!session) return
    setDeleting(true)
    setError(null)
    try {
      const result = await deleteSession(session.id)
      if ('error' in result) {
        setError(result.message)
        toast.error(result.message)
        setDeleting(false)
        return
      }
      toast.success('Session deleted')
      onOpenChange(false)
      if (onSessionUpdated) {
        onSessionUpdated()
      } else {
        router.refresh()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session'
      setError(errorMessage)
      toast.error(errorMessage)
      setDeleting(false)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (!session) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
          <DialogDescription>Update session details</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-medium">
              Date <span className="text-destructive">*</span>
            </label>
            <Input
              id="date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              disabled={loading || deleting}
            />
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <label htmlFor="startTime" className="text-sm font-medium">
              Start Time <span className="text-destructive">*</span>
            </label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              disabled={loading || deleting}
            />
          </div>

          {/* Duration presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Duration</label>
              <span className="text-xs text-muted-foreground">
                {endTimeInput ? 'Manual end time overrides presets' : 'Choose a preset or custom length'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_PRESETS.map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  variant={durationPreset === minutes && !endTimeInput ? 'secondary' : 'outline'}
                  className="w-full"
                  onClick={() => {
                    setDurationPreset(minutes)
                    setCustomDurationMinutes('')
                    setEndTimeInput('')
                  }}
                  disabled={loading || deleting}
                >
                  {minutes / 60}h
                </Button>
              ))}
              <Button
                type="button"
                variant={durationPreset === 'custom' && !endTimeInput ? 'secondary' : 'outline'}
                className="w-full"
                onClick={() => {
                  setDurationPreset('custom')
                  setEndTimeInput('')
                }}
                disabled={loading || deleting}
              >
                Custom
              </Button>
            </div>
            {durationPreset === 'custom' && (
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="customDuration"
                    type="number"
                    min="1"
                    placeholder="Minutes"
                    value={customDurationMinutes}
                    onChange={(e) => setCustomDurationMinutes(e.target.value)}
                    disabled={loading || deleting}
                  />
                  <div className="flex items-center text-xs text-muted-foreground">
                    e.g. 90 for 1h30m. Empty uses the 2h default.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual end time override */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="endTime" className="text-sm font-medium">
                End Time (optional)
              </label>
              {endTimeInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setEndTimeInput('')}
                  disabled={loading || deleting}
                >
                  Use duration instead
                </Button>
              )}
            </div>
            <Input
              id="endTime"
              type="time"
              value={endTimeInput}
              onChange={(e) => setEndTimeInput(e.target.value)}
              disabled={loading || deleting}
              placeholder="HH:MM"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use duration. If earlier than the start time, it will roll to the next day automatically.
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">{derivedStatus}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Starts</span>
              <span>{formattedStart || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ends</span>
              <span className="flex items-center gap-2">
                {crossesMidnight && (
                  <span className="text-xs text-muted-foreground italic">
                    next day
                  </span>
                )}
                {formattedEnd || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span>{durationLabel}</span>
            </div>
          </div>

          {/* Room */}
          <div className="space-y-2">
            <label htmlFor="room" className="text-sm font-medium">
              Room <span className="text-destructive">*</span>
            </label>
            <Select value={roomId} onValueChange={setRoomId} disabled={loading || rooms.length === 0}>
              <SelectTrigger id="room">
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rooms.length === 0 && !roomsLoading && (
              <p className="text-xs text-muted-foreground">
                Create a room in Settings to continue
              </p>
            )}
          </div>

          {/* Client */}
          <div className="space-y-2">
            <label htmlFor="client" className="text-sm font-medium">
              Client <span className="text-destructive">*</span>
            </label>
            <Select
              value={clientId}
              onValueChange={setClientId}
              disabled={loading || clientsLoading || clients.length === 0}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select a client"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clients.length === 0 && !clientsLoading && (
              <p className="text-xs text-muted-foreground">
                Create a client to continue
              </p>
            )}
          </div>

          {/* Engineer (Optional) */}
          <div className="space-y-2">
            <label htmlFor="engineer" className="text-sm font-medium">
              Engineer (Optional)
            </label>
            <Select value={engineerId || "none"} onValueChange={(value) => setEngineerId(value === "none" ? "" : value)} disabled={loading}>
              <SelectTrigger id="engineer">
                <SelectValue placeholder="Select an engineer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {/* TODO: Add engineer selection from studio members */}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={confirmDelete ? 'destructive' : 'ghost'}
                onClick={() => (confirmDelete ? handleDelete() : setConfirmDelete(true))}
                disabled={loading || deleting}
              >
                {confirmDelete ? (deleting ? 'Deleting…' : 'Confirm delete') : 'Delete session'}
              </Button>
              {confirmDelete && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={loading || deleting}
                >
                  Cancel
                </Button>
              )}
            </div>
            <div className="flex w-full sm:w-auto gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || deleting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {loading ? 'Updating...' : 'Update Session'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
