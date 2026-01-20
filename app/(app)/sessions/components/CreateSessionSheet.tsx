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
import { Textarea } from '@/components/ui/textarea'
import {
  createSession,
  getClients,
  getSessionDefaults,
  type Client,
} from '../actions'
import { getRooms, type Room } from '../../settings/rooms/actions'
import { createClient } from '../../clients/actions'
import { ClientCombobox } from './ClientCombobox'

type EndDetails = {
  value24: string
  displayTime: string
  displayDate: string
  dayOffset: number
  durationMinutes: number | null
  ready: boolean
}

interface CreateSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSessionCreated?: () => void
}

const steps = ['Client', 'Schedule', 'Extras']
const ONE_DAY_MS = 24 * 60 * 60 * 1000

const getTodayLocalISO = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isValidISODate = (value: string) => {
  if (!value) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00`)
  return !Number.isNaN(parsed.getTime())
}

const formatShortDate = (isoDate: string) => {
  // Returns "Sun Dec 28" style
  const parsed = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return ''
  const weekday = parsed.toLocaleDateString(undefined, { weekday: 'short' })
  const month = parsed.toLocaleDateString(undefined, { month: 'short' })
  const day = parsed.getDate()
  return `${weekday} ${month} ${day}`
}

const formatDuration = (minutes: number | null) => {
  if (!minutes) return ''
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs && mins) return `${hrs}h ${mins}m`
  if (hrs) return `${hrs}h`
  return `${mins}m`
}

const to12Hour = (value24: string) => {
  if (!value24) return ''
  const [hStr, mStr] = value24.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  const date = new Date()
  date.setHours(h)
  date.setMinutes(m)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
}

const isPartialTime = (val: string) => {
  const trimmed = val.trim().toLowerCase()
  if (!trimmed) return true
  if (trimmed.includes(':')) return false
  if (trimmed.includes('am') || trimmed.includes('pm')) return false
  return trimmed.length < 3
}

const parseTimeInput = (value: string): string | null => {
  if (!value?.trim()) return ''
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ')
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2] ?? '0')
  const meridiem = match[3]

  if (minute > 59) return null
  if (hour > 12 && meridiem) return null
  if (meridiem) {
    if (hour === 12) {
      hour = meridiem === 'am' ? 0 : 12
    } else if (meridiem === 'pm') {
      hour += 12
    }
  }
  if (!meridiem && hour > 23) return null

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function CreateSessionSheet({ open, onOpenChange, onSessionCreated }: CreateSessionModalProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [rooms, setRooms] = React.useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = React.useState(false)
  const [clients, setClients] = React.useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = React.useState(false)
  const [defaultsLoading, setDefaultsLoading] = React.useState(false)
  const [defaultSessionLengthHours, setDefaultSessionLengthHours] = React.useState<number | null>(null)
  const [defaultBufferMinutes, setDefaultBufferMinutes] = React.useState<number | null>(null)

  // Form state
  const [date, setDate] = React.useState('')
  const [baseDate, setBaseDate] = React.useState('') // last valid date (keeps title stable)
  const [startTime, setStartTime] = React.useState('')
  const [startTimeInput, setStartTimeInput] = React.useState('')
  const [endTimeOverride, setEndTimeOverride] = React.useState('')
  const [endTimeInput, setEndTimeInput] = React.useState('')
  const [roomId, setRoomId] = React.useState<string>('')
  const [clientId, setClientId] = React.useState<string | null>(null)
  const [clientName, setClientName] = React.useState('')
  const [engineerId, setEngineerId] = React.useState<string>('')
  const [notes, setNotes] = React.useState('')

  const [stepIndex, setStepIndex] = React.useState(0)

  // Load rooms, clients, and defaults when sheet opens
  React.useEffect(() => {
    if (open) {
      // Reset on open to avoid "Create Session" flash during close animation
      resetForm()
      const initialDate = getTodayLocalISO()
      setBaseDate(initialDate)
      // Set default date to today (local) to avoid timezone offset issues
      setDate(initialDate)
      loadRooms()
      loadClients()
      loadDefaults()
    }
  }, [open])

  // Reset roomId if the selected room no longer exists
  React.useEffect(() => {
    if (rooms.length > 0 && roomId && !rooms.find(r => r.id === roomId)) {
      setRoomId('')
    }
  }, [rooms, roomId])

  const resetForm = () => {
    setDate('')
    setStartTime('')
    setStartTimeInput('')
    setEndTimeOverride('')
    setEndTimeInput('')
    setRoomId('')
    setClientId(null)
    setClientName('')
    setEngineerId('')
    setNotes('')
    setError(null)
    setStepIndex(0)
  }

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

  const loadDefaults = async () => {
    setDefaultsLoading(true)
    try {
      const result = await getSessionDefaults()
      if ('success' in result && result.success) {
        setDefaultSessionLengthHours(result.default_session_length_hours)
        setDefaultBufferMinutes(result.default_buffer_minutes)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setDefaultsLoading(false)
    }
  }

  const sessionLengthHours = defaultSessionLengthHours && defaultSessionLengthHours > 0
    ? defaultSessionLengthHours
    : null

  const isCustomEnd = Boolean(endTimeOverride)

  // Keep display inputs in sync when values change programmatically
  React.useEffect(() => {
    setStartTimeInput(startTime ? to12Hour(startTime) : '')
  }, [startTime])

  React.useEffect(() => {
    setEndTimeInput(endTimeOverride ? to12Hour(endTimeOverride) : '')
  }, [endTimeOverride])

  const titleDateValue = React.useMemo(() => {
    if (isValidISODate(date)) return date
    if (isValidISODate(baseDate)) return baseDate
    return ''
  }, [date, baseDate])

  const displayStartDateTime = React.useMemo(() => {
    if (!titleDateValue || !startTime) return null
    const parsed = new Date(`${titleDateValue}T${startTime}`)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed
  }, [titleDateValue, startTime])

  const endDetails = React.useMemo<EndDetails>(() => {
    const fallback: EndDetails = {
      value24: '',
      displayTime: '',
      displayDate: '',
      dayOffset: 0,
      durationMinutes: null,
      ready: false,
    }

    if (!displayStartDateTime || !titleDateValue) return fallback

    let baseEnd: Date | null = null

    if (isCustomEnd && endTimeOverride) {
      const customEnd = new Date(`${titleDateValue}T${endTimeOverride}`)
      if (Number.isNaN(customEnd.getTime())) return fallback
      baseEnd = customEnd
    } else if (sessionLengthHours) {
      baseEnd = new Date(displayStartDateTime.getTime() + sessionLengthHours * 60 * 60 * 1000)
    } else {
      return fallback
    }

    let endDate = baseEnd
    let dayOffset = 0

    if (endDate <= displayStartDateTime) {
      endDate = new Date(endDate.getTime() + ONE_DAY_MS)
      dayOffset = 1
    } else {
      dayOffset = Math.floor((endDate.getTime() - displayStartDateTime.getTime()) / ONE_DAY_MS)
    }

    const durationMinutes = Math.max(1, Math.round((endDate.getTime() - displayStartDateTime.getTime()) / 60000))
    const hours = endDate.getHours().toString().padStart(2, '0')
    const minutes = endDate.getMinutes().toString().padStart(2, '0')

    return {
      value24: `${hours}:${minutes}`,
      displayTime: endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }),
      displayDate: endDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      dayOffset,
      durationMinutes,
      ready: true,
    }
  }, [displayStartDateTime, endTimeOverride, isCustomEnd, sessionLengthHours, titleDateValue])

  const endSummaryBase = React.useMemo(() => {
    if (!displayStartDateTime) return 'Set a start time to see the end time.'
    if (!isCustomEnd && !sessionLengthHours) return 'Loading session defaults...'
    if (isCustomEnd && !endTimeOverride) return 'Enter an end time or leave blank to use studio default.'
    if (!endDetails.ready || !endDetails.displayTime) return 'Add an end time to see the summary.'
    return `Ends ${endDetails.displayDate} · ${endDetails.displayTime}`
  }, [displayStartDateTime, endDetails.dayOffset, endDetails.displayDate, endDetails.displayTime, endDetails.ready, endTimeOverride, isCustomEnd, sessionLengthHours])

  const compactInlineSummary = React.useMemo(() => {
    if (!endDetails.ready || !endDetails.displayTime) return endSummaryBase
    const parts = [endSummaryBase]
    if (endDetails.durationMinutes) parts.push(`${formatDuration(endDetails.durationMinutes)} total`)
    return parts.join(' · ')
  }, [endDetails.displayTime, endDetails.durationMinutes, endDetails.ready, endSummaryBase])

  const footerSummary = compactInlineSummary

  const canCreate = Boolean(date && startTime && roomId && (clientId || clientName.trim()))

  const scheduleValid = Boolean(date && startTime)
  const clientValid = Boolean(roomId && (clientId || clientName.trim()))
  const isPrimaryEnabled =
    !loading &&
    (stepIndex === steps.length - 1 ? canCreate : stepIndex === 0 ? clientValid : scheduleValid)
  const primaryLabel =
    stepIndex === steps.length - 1
      ? loading
        ? 'Booking...'
        : 'Create & Book'
      : 'Continue'

  const handleCreateClientInline = async (name: string) => {
    if (!name.trim()) return null
    const result = await createClient({ name: name.trim() })
    if ('error' in result) {
      toast.error(result.message)
      return null
    }
    setClients((prev) => [...prev, result.client])
    setClientId(result.client.id)
    setClientName(result.client.name)
    return result.client
  }

  const resolveClientId = async () => {
    if (clientId) return clientId
    const name = clientName.trim()
    if (!name) return null
    const existing = clients.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    )
    if (existing) {
      setClientId(existing.id)
      return existing.id
    }
    const created = await handleCreateClientInline(name)
    return created?.id || null
  }

  const handleSubmit = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    if (!date || !startTime || !roomId || (!clientId && !clientName.trim())) {
      setError('Date, start time, room, and client name are required')
      setLoading(false)
      return
    }

    // Validate that the selected room still exists
    if (roomId && !rooms.find(r => r.id === roomId)) {
      setError('Selected room no longer exists. Please choose another.')
      setLoading(false)
      return
    }

    const resolvedClientId = await resolveClientId()
    if (!resolvedClientId) {
      setError('Client name is required to attach this session')
      setLoading(false)
      return
    }

    try {
      const result = await createSession({
        date,
        start_time: startTime,
        end_time: endTimeOverride || undefined,
        room_id: roomId,
        client_id: resolvedClientId,
        engineer_id: engineerId || null,
        notes: notes.trim() || null,
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

      toast.success('Session created and booked')
      onOpenChange(false)

      if (onSessionCreated) {
        onSessionCreated()
      } else {
        router.refresh()
      }
      setLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session'
      setError(errorMessage)
      toast.error(errorMessage)
      setLoading(false)
      return
    }
  }

  const goNext = () => setStepIndex((idx) => Math.min(idx + 1, steps.length - 1))
  const goBack = () => setStepIndex((idx) => Math.max(idx - 1, 0))

  const endTimeInputValue = isCustomEnd ? endTimeOverride : endDetails.value24

  const dateLabel = React.useMemo(() => {
    if (!titleDateValue) return ''
    return formatShortDate(titleDateValue)
  }, [titleDateValue])

  const startLabel = React.useMemo(() => {
    if (!titleDateValue || !startTime) return ''
    const parsed = new Date(`${titleDateValue}T${startTime}`)
    if (Number.isNaN(parsed.getTime())) return ''
    const base = formatShortDate(titleDateValue)
    const time = parsed.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${base} · ${time}`
  }, [titleDateValue, startTime])

  const endLabel = React.useMemo(() => {
    if (!endDetails.ready || !endDetails.displayTime) return ''
    return endDetails.displayTime
  }, [endDetails.displayTime, endDetails.ready])

  const roomLabel = React.useMemo(() => {
    if (!roomId) return ''
    const room = rooms.find((r) => r.id === roomId)
    return room?.name ?? ''
  }, [roomId, rooms])

  const clientLabel = React.useMemo(() => {
    const trimmed = clientName.trim()
    if (trimmed) return trimmed
    if (clientId) {
      const found = clients.find((c) => c.id === clientId)
      if (found) return found.name
    }
    return ''
  }, [clientId, clientName, clients])

  const titleText = React.useMemo(() => {
    const baseTitle = clientLabel ? `${clientLabel} Session` : 'New Session'

    // Only show date/time (and optional room) after schedule is set
    if (startLabel) {
      const parts = [clientLabel || 'Session', startLabel]
      if (roomLabel) parts.push(roomLabel)
      return parts.join(' · ')
    }

    // Before schedule: show client-forward title without implying a date/time
    return baseTitle
  }, [clientLabel, startLabel, roomLabel])

  const scheduleStep = (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="date" className="text-sm font-medium">
          Date <span className="text-destructive">*</span>
        </label>
        <Input
          id="date"
          type="date"
          value={date}
            onChange={(e) => {
              const next = e.target.value
              setDate(next)
              if (isValidISODate(next)) {
                setBaseDate(next)
              }
            }}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="startTime" className="text-sm font-medium">
            Start Time <span className="text-destructive">*</span>
          </label>
          <Input
            id="startTime"
            type="text"
            inputMode="numeric"
            placeholder="hh:mm AM/PM"
            value={startTimeInput}
            onChange={(e) => {
              const val = e.target.value
              setStartTimeInput(val)
              if (isPartialTime(val)) return
              const parsed = parseTimeInput(val)
              if (parsed !== null) {
                setStartTime(parsed)
              }
            }}
            onBlur={() => {
              const trimmed = startTimeInput.trim()
              if (!trimmed) {
                setStartTime('')
                setStartTimeInput('')
                return
              }
              const parsed = parseTimeInput(startTimeInput)
              if (parsed !== null) {
                setStartTime(parsed)
                setStartTimeInput(to12Hour(parsed))
              }
            }}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">End Time</label>
          <Input
            id="endTime"
            type="text"
            inputMode="numeric"
            disabled={loading}
            placeholder={!isCustomEnd && endDetails.displayTime ? endDetails.displayTime : 'hh:mm AM/PM'}
            value={endTimeInput}
            onChange={(e) => {
              const val = e.target.value
              setEndTimeInput(val)
              if (isPartialTime(val)) return
              const parsed = parseTimeInput(val)
              if (parsed !== null) {
                setEndTimeOverride(parsed)
              }
            }}
            onBlur={() => {
              const trimmed = endTimeInput.trim()
              if (!trimmed) {
                setEndTimeOverride('')
                setEndTimeInput('')
                return
              }
              const parsed = parseTimeInput(endTimeInput)
              if (parsed !== null) {
                setEndTimeOverride(parsed)
                setEndTimeInput(to12Hour(parsed))
              }
            }}
          />
        </div>
      </div>

    </div>
  )

  const clientStep = (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Client <span className="text-destructive">*</span></p>
          <p className="text-xs text-muted-foreground">
            Who is paying for this session
          </p>
        </div>
        <ClientCombobox
          clients={clients}
          loading={clientsLoading}
          value={{ id: clientId, name: clientName }}
          onInputChange={(next) => {
            setClientName(next)
            setClientId(null)
          }}
          onSelectExisting={(client) => {
            setClientId(client.id)
            setClientName(client.name)
          }}
          onCreateNew={handleCreateClientInline}
        />
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <label htmlFor="room" className="text-sm font-medium">
            Room <span className="text-destructive">*</span>
          </label>
          {rooms.length === 0 && !roomsLoading && (
            <p className="text-xs text-muted-foreground">
              Create a room in Settings to continue
            </p>
          )}
        </div>
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
      </div>
    </div>
  )

  const extrasStep = (
    <div className="space-y-4">
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
            <SelectValue placeholder="Assign later" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Assign later</SelectItem>
            {/* TODO: Add engineer selection from studio members */}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes (optional)
        </label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any quick context for the session. You can edit later."
          disabled={loading}
          rows={4}
        />
      </div>
    </div>
  )

  const renderStep = () => {
    if (stepIndex === 0) return clientStep
    if (stepIndex === 1) return scheduleStep
    return extrasStep
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm mt-4">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {renderStep()}
        </div>

        <DialogFooter className="mt-6 flex flex-col gap-3">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">{`Step ${stepIndex + 1} of ${steps.length}`}</div>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goBack}
                  disabled={loading}
                >
                  Back
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  if (stepIndex === steps.length - 1) {
                    handleSubmit()
                  } else {
                    goNext()
                  }
                }}
                disabled={!isPrimaryEnabled}
              >
                {primaryLabel}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
