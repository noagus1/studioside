'use client'

import * as React from 'react'
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
import { updateSession, getClients, type Client } from '../actions'
import { getRooms, type Room } from '../../settings/rooms/actions'
import type { Session } from '@/types/session'

interface SessionDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: Session
  onUpdated?: () => void
}

const DURATION_PRESETS = [60, 120, 240, 360, 480, 720] // minutes: 1h,2h,4h,6h,8h,12h
const DEFAULT_DURATION_MINUTES = 120

export function SessionDetailsDialog({ open, onOpenChange, session, onUpdated }: SessionDetailsDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [rooms, setRooms] = React.useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = React.useState(false)
  const [clients, setClients] = React.useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = React.useState(false)

  const [startDate, setStartDate] = React.useState('')
  const [startTime, setStartTime] = React.useState('')
  const [endTimeInput, setEndTimeInput] = React.useState('')
  const [durationPreset, setDurationPreset] = React.useState<number | 'custom'>(DEFAULT_DURATION_MINUTES)
  const [customDurationMinutes, setCustomDurationMinutes] = React.useState('')
  const [roomId, setRoomId] = React.useState<string>('')
  const [clientId, setClientId] = React.useState<string>('')
  const [engineerId, setEngineerId] = React.useState<string>('')

  // Load rooms/clients and seed form when opened
  React.useEffect(() => {
    if (open && session) {
      loadRooms()
      loadClients()

      const startDateObj = new Date(session.start_time)
      const endDateObj = new Date(session.end_time)

      const durationMinutes = Math.max(1, Math.round((endDateObj.getTime() - startDateObj.getTime()) / 60000))
      const durationPresetValue = DURATION_PRESETS.includes(durationMinutes) ? durationMinutes : 'custom'

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
      setError(null)
    }

    if (!open) {
      setError(null)
      setEndTimeInput('')
      setDurationPreset(DEFAULT_DURATION_MINUTES)
      setCustomDurationMinutes('')
    }
  }, [open, session])

  React.useEffect(() => {
    if (rooms.length > 0 && roomId && !rooms.find((r) => r.id === roomId)) {
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

  const formattedStart = React.useMemo(() => {
    return startDateTimeIso
      ? new Date(startDateTimeIso).toLocaleString(undefined, {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '—'
  }, [startDateTimeIso])

  const formattedEnd = React.useMemo(() => {
    return endDateTimeIso
      ? new Date(endDateTimeIso).toLocaleString(undefined, {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '—'
  }, [endDateTimeIso])

  const durationLabel = React.useMemo(() => {
    if (!startDateTimeIso || !endDateTimeIso) return '—'
    const minutes = Math.max(
      0,
      Math.round((new Date(endDateTimeIso).getTime() - new Date(startDateTimeIso).getTime()) / 60000)
    )
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours && mins) return `${hours}h ${mins}m`
    if (hours) return `${hours}h`
    return `${mins}m`
  }, [endDateTimeIso, startDateTimeIso])

  const loadRooms = async () => {
    setRoomsLoading(true)
    try {
      const result = await getRooms()
      if ('success' in result && result.success) {
        setRooms(result.rooms)
      } else {
        toast.error('error' in result ? result.message : 'Failed to load rooms')
        setRooms([])
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load rooms')
      setRooms([])
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
        setClients([])
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load clients')
      setClients([])
    } finally {
      setClientsLoading(false)
    }
  }

  const canSubmit = React.useMemo(
    () => Boolean(startDate && startTime && endDateTimeIso && roomId && clientId) && !loading,
    [startDate, startTime, endDateTimeIso, roomId, clientId, loading]
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

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

    if (!rooms.find((r) => r.id === roomId)) {
      setError('Selected room no longer exists. Please select a different room.')
      setLoading(false)
      return
    }

    if (!clients.find((c) => c.id === clientId)) {
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
        setError(result.message)
        if (result.error === 'ROOM_CONFLICT' || result.error === 'ENGINEER_CONFLICT') {
          toast.error(result.message)
        } else {
          toast.error(result.message)
        }
        setLoading(false)
        return
      }

      toast.success('Session updated')
      onOpenChange(false)
      onUpdated?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update session'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit session details</DialogTitle>
          <DialogDescription>Update schedule, client, room, and duration.</DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="text-xs text-muted-foreground">Client</div>
          <div className="text-right font-medium">{clients.find((c) => c.id === clientId)?.name || '—'}</div>
          <div className="text-xs text-muted-foreground">Engineer</div>
          <div className="text-right font-medium">
            {engineerId ? 'Assigned' : '—'}
          </div>
          <div className="text-xs text-muted-foreground">Room</div>
          <div className="text-right font-medium">{rooms.find((r) => r.id === roomId)?.name || '—'}</div>
          <div className="text-xs text-muted-foreground">Starts</div>
          <div className="text-right font-medium">{formattedStart}</div>
          <div className="text-xs text-muted-foreground">Ends</div>
          <div className="text-right font-medium">{formattedEnd}</div>
          <div className="text-xs text-muted-foreground">Duration</div>
          <div className="text-right font-medium">{durationLabel}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

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
                <SelectValue placeholder={clientsLoading ? 'Loading clients...' : 'Select a client'} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="engineer" className="text-sm font-medium">
              Engineer (optional)
            </label>
            <Select
              value={engineerId || 'none'}
              onValueChange={(value) => setEngineerId(value === 'none' ? '' : value)}
              disabled={loading}
            >
              <SelectTrigger id="engineer">
                <SelectValue placeholder="Select an engineer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              <p className="text-xs text-muted-foreground">Create a room in Settings to continue</p>
            )}
          </div>

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
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="startTime" className="text-sm font-medium">
              Start time <span className="text-destructive">*</span>
            </label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="endTime" className="text-sm font-medium">
                End time (optional)
              </label>
              {endTimeInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setEndTimeInput('')}
                  disabled={loading}
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
              disabled={loading}
              placeholder="HH:MM"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use duration. If earlier than the start time, it will roll to the next day automatically.
            </p>
          </div>

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
                  disabled={loading}
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
                disabled={loading}
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
                    disabled={loading}
                  />
                  <div className="flex items-center text-xs text-muted-foreground">
                    e.g. 90 for 1h30m. Empty uses the 2h default.
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {loading ? 'Updating...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


