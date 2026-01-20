'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClientCombobox } from '../components/ClientCombobox'
import {
  createSession,
  getClients,
  getSessionDefaults,
  type Client as SessionClient,
} from '../actions'
import { getRooms, type Room } from '../../settings/rooms/actions'
import { createClient } from '../../clients/actions'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

type EndDetails = {
  value24: string
  displayTime: string
  displayDate: string
  dayOffset: number
  durationMinutes: number | null
  ready: boolean
}

type SessionDraft = {
  date: string
  baseDate: string
  startTime: string
  startTimeInput: string
  endTimeOverride: string
  endTimeInput: string
  roomId: string
  clientId: string | null
  clientName: string
  engineerId: string
  notes: string
}

type ModalKey = 'schedule' | 'location' | 'people' | 'services' | 'resources' | 'notes' | null

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

export default function SessionBuilderPage() {
  const router = useRouter()

  const [rooms, setRooms] = React.useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = React.useState(false)
  const [clients, setClients] = React.useState<SessionClient[]>([])
  const [clientsLoading, setClientsLoading] = React.useState(false)
  const [defaultsLoading, setDefaultsLoading] = React.useState(false)
  const [defaultSessionLengthHours, setDefaultSessionLengthHours] = React.useState<number | null>(null)
  const [defaultBufferMinutes, setDefaultBufferMinutes] = React.useState<number | null>(null)
  const [modalKey, setModalKey] = React.useState<ModalKey>(null)
  const [draftBackup, setDraftBackup] = React.useState<SessionDraft | null>(null)

  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [draft, setDraft] = React.useState<SessionDraft>(() => {
    const initialDate = getTodayLocalISO()
    return {
      date: initialDate,
      baseDate: initialDate,
      startTime: '',
      startTimeInput: '',
      endTimeOverride: '',
      endTimeInput: '',
      roomId: '',
      clientId: null,
      clientName: '',
      engineerId: '',
      notes: '',
    }
  })

  const sessionLengthHours =
    defaultSessionLengthHours && defaultSessionLengthHours > 0 ? defaultSessionLengthHours : null
  const isCustomEnd = Boolean(draft.endTimeOverride)

  React.useEffect(() => {
    loadRooms()
    loadClients()
    loadDefaults()
  }, [])

  React.useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      startTimeInput: prev.startTime ? to12Hour(prev.startTime) : '',
    }))
  }, [draft.startTime])

  React.useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      endTimeInput: prev.endTimeOverride ? to12Hour(prev.endTimeOverride) : '',
    }))
  }, [draft.endTimeOverride])

  const loadRooms = async () => {
    setRoomsLoading(true)
    try {
      const result = await getRooms()
      if ('success' in result && result.success) {
        setRooms(result.rooms)
      } else {
        const message = 'error' in result ? result.message : 'Failed to load rooms'
        toast.error(message)
        setRooms([])
      }
    } catch (err) {
      toast.error('Failed to load rooms')
      console.error(err)
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
    } catch (err) {
      toast.error('Failed to load clients')
      console.error(err)
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
    } catch (err) {
      console.error(err)
    } finally {
      setDefaultsLoading(false)
    }
  }

  const titleDateValue = React.useMemo(() => {
    if (isValidISODate(draft.date)) return draft.date
    if (isValidISODate(draft.baseDate)) return draft.baseDate
    return ''
  }, [draft.baseDate, draft.date])

  const displayStartDateTime = React.useMemo(() => {
    if (!titleDateValue || !draft.startTime) return null
    const parsed = new Date(`${titleDateValue}T${draft.startTime}`)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed
  }, [draft.startTime, titleDateValue])

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

    if (isCustomEnd && draft.endTimeOverride) {
      const customEnd = new Date(`${titleDateValue}T${draft.endTimeOverride}`)
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
  }, [displayStartDateTime, draft.endTimeOverride, isCustomEnd, sessionLengthHours, titleDateValue])

  const endSummaryBase = React.useMemo(() => {
    if (!displayStartDateTime) return 'Set a start time to see the end time.'
    if (!isCustomEnd && !sessionLengthHours) return defaultsLoading ? 'Loading session defaults...' : 'Set a duration to see the end time.'
    if (isCustomEnd && !draft.endTimeOverride) return 'Enter an end time or leave blank to use studio default.'
    if (!endDetails.ready || !endDetails.displayTime) return 'Add an end time to see the summary.'
    return `Ends ${endDetails.displayDate} · ${endDetails.displayTime}`
  }, [defaultsLoading, displayStartDateTime, draft.endTimeOverride, endDetails.displayDate, endDetails.displayTime, endDetails.ready, isCustomEnd, sessionLengthHours])

  const compactInlineSummary = React.useMemo(() => {
    if (!endDetails.ready || !endDetails.displayTime) return endSummaryBase
    const parts = [endSummaryBase]
    if (endDetails.durationMinutes) parts.push(`${formatDuration(endDetails.durationMinutes)} total`)
    if (defaultBufferMinutes) parts.push(`${defaultBufferMinutes}m buffer`)
    return parts.join(' · ')
  }, [defaultBufferMinutes, endDetails.displayTime, endDetails.durationMinutes, endDetails.ready, endSummaryBase])

  const canCreate = Boolean(
    draft.date &&
      draft.startTime &&
      draft.roomId &&
      (draft.clientId || draft.clientName.trim())
  )

  const handleCreateClientInline = async (name: string) => {
    if (!name.trim()) return null
    const result = await createClient({ name: name.trim() })
    if ('error' in result) {
      toast.error(result.message)
      return null
    }
    setClients((prev) => [...prev, result.client])
    setDraft((prev) => ({
      ...prev,
      clientId: result.client.id,
      clientName: result.client.name,
    }))
    return result.client
  }

  const resolveClientId = async () => {
    if (draft.clientId) return draft.clientId
    const name = draft.clientName.trim()
    if (!name) return null
    const existing = clients.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      setDraft((prev) => ({ ...prev, clientId: existing.id }))
      return existing.id
    }
    const created = await handleCreateClientInline(name)
    return created?.id || null
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)

    if (!draft.date || !draft.startTime || !draft.roomId || (!draft.clientId && !draft.clientName.trim())) {
      setError('Date, start time, room, and client are required')
      setSubmitting(false)
      return
    }

    if (draft.roomId && !rooms.find((r) => r.id === draft.roomId)) {
      setError('Selected room no longer exists. Please choose another.')
      setSubmitting(false)
      return
    }

    const resolvedClientId = await resolveClientId()
    if (!resolvedClientId) {
      setError('Client name is required to attach this session')
      setSubmitting(false)
      return
    }

    try {
      const result = await createSession({
        date: draft.date,
        start_time: draft.startTime,
        end_time: draft.endTimeOverride || undefined,
        room_id: draft.roomId,
        client_id: resolvedClientId,
        engineer_id: draft.engineerId || null,
        notes: draft.notes.trim() || null,
      })

      if ('error' in result) {
        if (result.error === 'ROOM_CONFLICT' || result.error === 'ENGINEER_CONFLICT') {
          setError(result.message)
          if (result.conflictDetails) {
            toast.error(
              `Conflict: ${result.conflictDetails.conflicting_client_name || 'Another session'} from ${new Date(
                result.conflictDetails.conflicting_start_time
              ).toLocaleTimeString()} to ${new Date(result.conflictDetails.conflicting_end_time).toLocaleTimeString()}`
            )
          }
        } else {
          setError(result.message)
          toast.error(result.message)
        }
        setSubmitting(false)
        return
      }

      toast.success('Session created')
      router.push(`/sessions/${result.session.id}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session'
      setError(errorMessage)
      toast.error(errorMessage)
      setSubmitting(false)
      return
    }
  }

  const openModal = (key: Exclude<ModalKey, null>) => {
    setDraftBackup(draft)
    setModalKey(key)
  }

  const handleModalCancel = () => {
    if (draftBackup) {
      setDraft(draftBackup)
    }
    setDraftBackup(null)
    setModalKey(null)
  }

  const handleModalSave = () => {
    setDraftBackup(null)
    setModalKey(null)
  }

  const renderScheduleFields = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="date" className="text-sm font-medium">
          Date <span className="text-destructive">*</span>
        </label>
        <Input
          id="date"
          type="date"
          value={draft.date}
          onChange={(e) => {
            const next = e.target.value
            setDraft((prev) => ({
              ...prev,
              date: next,
              baseDate: isValidISODate(next) ? next : prev.baseDate,
            }))
          }}
          disabled={submitting}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="startTime" className="text-sm font-medium">
            Start Time <span className="text-destructive">*</span>
          </label>
          <Input
            id="startTime"
            type="text"
            inputMode="numeric"
            placeholder="hh:mm AM/PM"
            value={draft.startTimeInput}
            onChange={(e) => {
              const val = e.target.value
              setDraft((prev) => ({ ...prev, startTimeInput: val }))
              if (isPartialTime(val)) return
              const parsed = parseTimeInput(val)
              if (parsed !== null) {
                setDraft((prev) => ({ ...prev, startTime: parsed }))
              }
            }}
            onBlur={() => {
              const trimmed = draft.startTimeInput.trim()
              if (!trimmed) {
                setDraft((prev) => ({ ...prev, startTime: '', startTimeInput: '' }))
                return
              }
              const parsed = parseTimeInput(draft.startTimeInput)
              if (parsed !== null) {
                setDraft((prev) => ({ ...prev, startTime: parsed, startTimeInput: to12Hour(parsed) }))
              }
            }}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="endTime" className="text-sm font-medium">
            End Time
          </label>
          <Input
            id="endTime"
            type="text"
            inputMode="numeric"
            placeholder={!isCustomEnd && endDetails.displayTime ? endDetails.displayTime : 'hh:mm AM/PM'}
            value={draft.endTimeInput}
            onChange={(e) => {
              const val = e.target.value
              setDraft((prev) => ({ ...prev, endTimeInput: val }))
              if (isPartialTime(val)) return
              const parsed = parseTimeInput(val)
              if (parsed !== null) {
                setDraft((prev) => ({ ...prev, endTimeOverride: parsed }))
              }
            }}
            onBlur={() => {
              const trimmed = draft.endTimeInput.trim()
              if (!trimmed) {
                setDraft((prev) => ({ ...prev, endTimeOverride: '', endTimeInput: '' }))
                return
              }
              const parsed = parseTimeInput(draft.endTimeInput)
              if (parsed !== null) {
                setDraft((prev) => ({ ...prev, endTimeOverride: parsed, endTimeInput: to12Hour(parsed) }))
              }
            }}
            disabled={submitting}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{compactInlineSummary}</p>
    </div>
  )

  const renderLocationFields = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="roomSelect" className="text-sm font-medium">
          Room <span className="text-destructive">*</span>
        </label>
        {rooms.length === 0 && !roomsLoading && (
          <p className="text-xs text-muted-foreground">Create a room in Settings to continue</p>
        )}
      </div>
      <Select
        value={draft.roomId}
        onValueChange={(value) => setDraft((prev) => ({ ...prev, roomId: value }))}
        disabled={submitting || rooms.length === 0}
      >
        <SelectTrigger id="roomSelect">
          <SelectValue placeholder={roomsLoading ? 'Loading rooms...' : 'Select a room'} />
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
  )

  const renderPeopleFields = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">
          Client <span className="text-destructive">*</span>
        </p>
        <p className="text-xs text-muted-foreground">Who is attached to this session</p>
      </div>
      <ClientCombobox
        clients={clients}
        loading={clientsLoading}
        value={{ id: draft.clientId, name: draft.clientName }}
        onInputChange={(next) => {
          setDraft((prev) => ({ ...prev, clientName: next, clientId: null }))
        }}
        onSelectExisting={(client) => {
          setDraft((prev) => ({ ...prev, clientId: client.id, clientName: client.name }))
        }}
        onCreateNew={handleCreateClientInline}
      />
      <div className="space-y-2">
        <label htmlFor="engineer" className="text-sm font-medium text-muted-foreground">
          Engineer (optional)
        </label>
        <Select
          value={draft.engineerId || 'none'}
          onValueChange={(value) => setDraft((prev) => ({ ...prev, engineerId: value === 'none' ? '' : value }))}
          disabled={submitting}
        >
          <SelectTrigger id="engineer">
            <SelectValue placeholder="Assign later" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Assign later</SelectItem>
            {/* Future: populate with studio members */}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const renderServicesFields = () => (
    <div className="rounded-lg border border-border/60 bg-card p-3 text-sm text-muted-foreground">
      Service toggles will live here. No transactional or payment flows in this view.
    </div>
  )

  const renderResourcesFields = () => (
    <div className="rounded-lg border border-border/60 bg-card p-3 text-sm text-muted-foreground">
      Select gear from the Add gear drawer on the session page after creating the session. Notes below are optional.
    </div>
  )

  const renderNotesFields = () => (
    <Textarea
      id="notes"
      value={draft.notes}
      onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
      placeholder="Any quick context for the session. You can edit later."
      disabled={submitting}
      rows={4}
    />
  )

  const clientLabel = React.useMemo(() => {
    const trimmed = draft.clientName.trim()
    if (trimmed) return trimmed
    if (draft.clientId) {
      const found = clients.find((c) => c.id === draft.clientId)
      if (found) return found.name
    }
    return ''
  }, [clients, draft.clientId, draft.clientName])

  const roomLabel = React.useMemo(() => {
    if (!draft.roomId) return ''
    const room = rooms.find((r) => r.id === draft.roomId)
    return room?.name ?? ''
  }, [draft.roomId, rooms])

  const startLabel = React.useMemo(() => {
    if (!titleDateValue || !draft.startTime) return ''
    const parsed = new Date(`${titleDateValue}T${draft.startTime}`)
    if (Number.isNaN(parsed.getTime())) return ''
    const base = formatShortDate(titleDateValue)
    const time = parsed.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${base} · ${time}`
  }, [draft.startTime, titleDateValue])

  const scheduleMissing = !draft.date || !draft.startTime
  const locationMissing = !draft.roomId
  const peopleMissing = !clientLabel

  const trimmedNotes = draft.notes.trim()
  const notesPresent = trimmedNotes.length > 0

  const summaryRows: Array<{
    key: Exclude<ModalKey, null>
    label: string
    value: string
    helper?: string
    required?: boolean
    missing?: boolean
    completed: boolean
  }> = [
    {
      key: 'people',
      label: 'People',
      value: clientLabel || 'Add a client',
      helper: draft.engineerId ? 'Engineer assigned' : 'Engineer optional',
      required: true,
      missing: peopleMissing,
      completed: !peopleMissing,
    },
    {
      key: 'schedule',
      label: 'Schedule',
      value: startLabel || 'Add date & start time',
      helper: endDetails.displayTime ? `Ends ${endDetails.displayDate} · ${endDetails.displayTime}` : endSummaryBase,
      required: true,
      missing: scheduleMissing,
      completed: !scheduleMissing,
    },
    {
      key: 'location',
      label: 'Location',
      value: roomLabel || 'Select a room',
      required: true,
      missing: locationMissing,
      completed: !locationMissing,
    },
    {
      key: 'resources',
      label: 'Resources',
      value: 'Add gear needs or skip for now',
      completed: false,
    },
    {
      key: 'services',
      label: 'Notes',
      value: notesPresent ? `${trimmedNotes.slice(0, 80)}${trimmedNotes.length > 80 ? '…' : ''}` : 'Add notes or services',
      helper: 'Optional',
      completed: notesPresent,
    },
  ]

  const requiredRows = summaryRows.filter((row) => row.required)
  const completedRequired = requiredRows.filter((row) => row.completed).length
  const missingRequired = requiredRows.filter((row) => !row.completed)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Create Session</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => router.push('/sessions')} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canCreate || submitting}>
              {submitting ? 'Creating...' : 'Create Session'}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Session details</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold leading-none ${
                missingRequired.length === 0
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              }`}
            >
              {missingRequired.length === 0 ? (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Ready to create
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4" strokeLinecap="round" />
                    <circle cx="12" cy="16" r="1" />
                  </svg>
                  {completedRequired} of {requiredRows.length} completed
                </>
              )}
            </span>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {summaryRows.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => openModal(item.key)}
              className="w-full rounded-md border bg-background px-3 py-2 text-left transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">
                    {item.label}
                    {item.required && item.missing ? ' • required' : ''}
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      item.required && item.missing ? 'text-destructive' : ''
                    }`}
                  >
                    {item.value}
                  </div>
                  {item.helper && <div className="text-xs text-muted-foreground/70">{item.helper}</div>}
                </div>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-full border border-muted-foreground/50 text-muted-foreground">
                  {item.completed ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-transparent" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={handleSubmit} disabled={!canCreate || submitting}>
            {submitting ? 'Creating...' : 'Create Session'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Add a client, date, start time, or room to get started.
          </p>
        </div>
      </div>

      <Dialog open={modalKey === 'schedule'} onOpenChange={(open) => (!open ? handleModalCancel() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule</DialogTitle>
            <DialogDescription>Set the date, start time, and optional end time override.</DialogDescription>
          </DialogHeader>
          {renderScheduleFields()}
          <DialogFooter>
            <Button variant="outline" onClick={handleModalCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleModalSave} disabled={submitting}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalKey === 'location'} onOpenChange={(open) => (!open ? handleModalCancel() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Location</DialogTitle>
            <DialogDescription>Select the room for this session.</DialogDescription>
          </DialogHeader>
          {renderLocationFields()}
          <DialogFooter>
            <Button variant="outline" onClick={handleModalCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleModalSave} disabled={submitting}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalKey === 'people'} onOpenChange={(open) => (!open ? handleModalCancel() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>People</DialogTitle>
            <DialogDescription>Choose the client and optionally assign an engineer.</DialogDescription>
          </DialogHeader>
          {renderPeopleFields()}
          <DialogFooter>
            <Button variant="outline" onClick={handleModalCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleModalSave} disabled={submitting}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalKey === 'services'} onOpenChange={(open) => (!open ? handleModalCancel() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Services & Notes</DialogTitle>
            <DialogDescription>Outline the work and add any notes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {renderServicesFields()}
            {renderNotesFields()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleModalCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleModalSave} disabled={submitting}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalKey === 'resources'} onOpenChange={(open) => (!open ? handleModalCancel() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resources</DialogTitle>
            <DialogDescription>Capture gear or other resources needed.</DialogDescription>
          </DialogHeader>
          {renderResourcesFields()}
          <DialogFooter>
            <Button variant="outline" onClick={handleModalCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleModalSave} disabled={submitting}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

