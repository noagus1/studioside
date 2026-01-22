'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarClock, Check, ChevronRight, Clock, MapPin, MoreHorizontal, User, UserRound, XCircle } from 'lucide-react'
import { getCategoryIconByKey } from '../../gear/categoryIcons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SessionDetailsDialog } from './SessionDetailsDialog'
import { SessionNotesDialog } from './SessionNotesDialog'
import { SessionDateDialog } from './SessionDateDialog'
import { SessionTimeDialog } from './SessionTimeDialog'
import { SessionRoomDialog } from './SessionRoomDialog'
import { GearListDisplay, SessionGearDialog } from './SessionGearDialog'
import { deleteSession, updateSessionStatus } from '../actions'
import type { Session, SessionResource } from '@/types/session'
import type { SessionStatus } from '@/types/db'
import { formatSessionDay, formatSessionTime } from '@/utils/sessionDisplay'

type EngineerSource = 'studio' | 'external'

type EngineerDisplay = {
  source: EngineerSource
  name?: string
  note?: string
  isTbd?: boolean
}

type AssignedTeamDisplay = {
  engineer: EngineerDisplay
  assistants: string[]
  runners: string[]
}

interface SessionDetailClientProps {
  session: Session
  timeZone?: string
}

export function SessionDetailClient({ session, timeZone }: SessionDetailClientProps) {
  const router = useRouter()
  const [activeDialog, setActiveDialog] = React.useState<'details' | 'resources' | 'notes' | null>(null)
  const [dateDialogOpen, setDateDialogOpen] = React.useState(false)
  const [timeDialogOpen, setTimeDialogOpen] = React.useState(false)
  const [roomDialogOpen, setRoomDialogOpen] = React.useState(false)
  const [expanded, setExpanded] = React.useState<
    Record<'details' | 'resources' | 'notes' | 'assigned-team', boolean>
  >({
    details: false,
    resources: false,
    notes: false,
    'assigned-team': false,
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const initialResources = React.useMemo(
    () => session.gear_items || session.resources || [],
    [session.gear_items, session.resources]
  )
  const [resources, setResources] = React.useState<SessionResource[]>(initialResources)

  React.useEffect(() => {
    setResources(initialResources)
  }, [initialResources])

  const [statusUpdating, setStatusUpdating] = React.useState<SessionStatus | null>(null)

  const handleUpdated = React.useCallback(() => {
    setActiveDialog(null)
    router.refresh()
  }, [router])
  const handleResourcesUpdated = React.useCallback((updated?: SessionResource[]) => {
    if (updated) {
      setResources(updated)
    }
  }, [])

  const durationMinutes = React.useMemo(() => {
    const start = new Date(session.start_time)
    const end = new Date(session.end_time)
    const diff = Math.max(0, end.getTime() - start.getTime())
    return Math.round(diff / 60000)
  }, [session.end_time, session.start_time])

  const durationLabel = React.useMemo(() => {
    if (!durationMinutes) return '—'
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    if (hours && minutes) return `${hours}h ${minutes}m`
    if (hours) return `${hours}h`
    return `${minutes}m`
  }, [durationMinutes])

  const dayLabel = formatSessionDay(session, { timeZone, includeYear: true })
  const timeLabel = formatSessionTime(session, { timeZone })
  const roomLabel = session.room?.name || 'Select room'
  const engineerLabel = session.engineer?.full_name || session.engineer?.email
  const assignedTeam: AssignedTeamDisplay = React.useMemo(() => {
    const engineerName = session.engineer?.full_name || session.engineer?.email
    const engineer: EngineerDisplay = engineerName
      ? {
          source: 'studio',
          name: engineerName,
        }
      : {
          source: 'external',
          name: 'TBD',
          isTbd: true,
        }

    return {
      engineer,
      assistants: [],
      runners: [],
    }
  }, [session.engineer])
  const detailsComplete = Boolean(session.client && session.room && session.start_time && session.end_time)
  const teamComplete = Boolean(session.engineer)
  const resourcesComplete = resources.length > 0
  const notesComplete = Boolean(session.notes && session.notes.trim().length > 0)
  const formatResourceLabel = React.useCallback((res: SessionResource) => {
    const brandModel = [res.gear?.brand, res.gear?.model].filter(Boolean).join(' ').trim()
    if (brandModel) return brandModel
    if (res.gear?.type?.name) return res.gear.type.name
    return 'Gear'
  }, [])
  const formatDateTime = React.useCallback(
    (value: string) => {
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
      if (timeZone) options.timeZone = timeZone
      return new Intl.DateTimeFormat('en-US', options).format(new Date(value))
    },
    [timeZone]
  )

  const toggleSection = (key: 'details' | 'resources' | 'notes' | 'assigned-team') => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const lifecycleLabel = React.useMemo(() => {
    const labels: Record<SessionStatus, string> = {
      scheduled: 'Scheduled',
      in_progress: 'In progress',
      live: 'Live',
      completed: 'Completed',
      finished: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No show',
    }
    return labels[session.status] ?? 'Scheduled'
  }, [session.status])

  const lifecycleTone = React.useMemo(() => {
    if (session.status === 'cancelled') return 'text-destructive'
    if (session.status === 'completed' || session.status === 'finished') return 'text-muted-foreground'
    return 'text-foreground'
  }, [session.status])

  const handleLifecycleChange = React.useCallback(
    async (nextStatus: SessionStatus) => {
      setStatusUpdating(nextStatus)
      try {
        const result = await updateSessionStatus(session.id, nextStatus)
        if ('error' in result) {
          toast.error(result.message)
          return
        }

        const successLabel =
          nextStatus === 'in_progress'
            ? 'Session started'
            : nextStatus === 'completed'
              ? 'Session ended'
              : nextStatus === 'finished'
                ? 'Session marked finished'
                : nextStatus === 'cancelled'
                  ? 'Session cancelled'
                  : nextStatus === 'scheduled'
                    ? 'Session restored'
                    : 'Session updated'
        toast.success(successLabel)
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update session status'
        toast.error(message)
      } finally {
        setStatusUpdating(null)
      }
    },
    [router, session.id]
  )

  const handleDelete = React.useCallback(async () => {
    setDeleting(true)
    try {
      const result = await deleteSession(session.id)
      if ('error' in result) {
        toast.error(result.message)
        setDeleting(false)
        return
      }
      toast.success('Session deleted')
      setDeleteDialogOpen(false)
      router.push('/sessions')
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete session'
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }, [router, session.id])

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold leading-tight text-foreground">
                  {session.client?.name ? `${session.client.name} Session` : 'Session'}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <div className="flex flex-col items-start gap-1 md:items-end">
                  <div className={`inline-flex items-center gap-2 text-sm font-medium ${lifecycleTone}`}>
                    {lifecycleLabel}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label="Open session actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem disabled>Duplicate session</DropdownMenuItem>
                    {session.status === 'cancelled' ? (
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          handleLifecycleChange('scheduled')
                        }}
                        disabled={Boolean(statusUpdating)}
                      >
                        Restore session
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={(event) => {
                          event.preventDefault()
                          handleLifecycleChange('cancelled')
                        }}
                        disabled={Boolean(statusUpdating)}
                      >
                        Cancel session
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(event) => {
                        event.preventDefault()
                        setDeleteDialogOpen(true)
                      }}
                    >
                      Delete session
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setDateDialogOpen(true)}
                className="inline-flex items-center gap-2 rounded-md px-1 -mx-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Edit session date"
              >
                <CalendarClock className="h-4 w-4" />
                {dayLabel}
              </button>
              <button
                type="button"
                onClick={() => setTimeDialogOpen(true)}
                className="inline-flex items-center gap-2 rounded-md px-1 -mx-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Edit session time"
              >
                <Clock className="h-4 w-4" />
                {timeLabel}
              </button>
              <button
                type="button"
                onClick={() => setRoomDialogOpen(true)}
                className="inline-flex items-center gap-2 rounded-md px-1 -mx-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Edit session room"
              >
                <MapPin className="h-4 w-4" />
                {roomLabel}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {([
            {
              key: 'details' as const,
              title: 'Client & Schedule',
              complete: detailsComplete,
              onEdit: () => setActiveDialog('details'),
              content: (
                <div className="space-y-4">
                  <DetailRow icon={<User className="h-4 w-4" />} label="Client" value={session.client?.name || '—'} />
                  {engineerLabel && (
                    <DetailRow icon={<UserRound className="h-4 w-4" />} label="Engineer" value={engineerLabel} />
                  )}
                  <DetailRow icon={<MapPin className="h-4 w-4" />} label="Room" value={session.room?.name || '—'} />
                  <DetailRow icon={<CalendarClock className="h-4 w-4" />} label="Starts" value={formatDateTime(session.start_time)} />
                  <DetailRow icon={<CalendarClock className="h-4 w-4" />} label="Ends" value={formatDateTime(session.end_time)} />
                  <DetailRow icon={<Clock className="h-4 w-4" />} label="Duration" value={durationLabel} />
                </div>
              ),
            },
            {
              key: 'assigned-team' as const,
              title: 'Assigned Team',
              complete: teamComplete,
              onEdit: () => setActiveDialog('details'),
              content: (
                <div className="space-y-4">
                  <TeamRow
                    label="ENGINEER"
                    value={assignedTeam.engineer.name ?? '—'}
                    source={assignedTeam.engineer.source}
                    isTbd={assignedTeam.engineer.isTbd}
                    note={assignedTeam.engineer.note}
                  />
                  <TeamRow
                    label="ASSISTANT ENGINEER"
                    value={assignedTeam.assistants.length > 0 ? assignedTeam.assistants.join(', ') : '—'}
                  />
                  <TeamRow
                    label="RUNNER"
                    value={assignedTeam.runners.length > 0 ? assignedTeam.runners.join(', ') : '—'}
                  />
                </div>
              ),
            },
            {
              key: 'resources' as const,
              title: 'Gear',
              complete: resourcesComplete,
              onEdit: () => setActiveDialog('resources'),
              content: (
                <div className="space-y-3">
                  {resources && resources.length > 0 ? (
                    resources.map((res) => (
                      <div
                        key={res.gear_id}
                        className="space-y-2 rounded-lg border border-muted/40 bg-muted/30 p-3"
                      >
                        <GearListDisplay gear={res.gear} />
                        {res.note && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{res.note}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-3">
                      <p className="text-sm text-muted-foreground">No gear attached.</p>
                      <Button size="sm" variant="secondary" onClick={() => setActiveDialog('resources')}>
                        Attach gear
                      </Button>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'notes' as const,
              title: 'Notes',
              complete: notesComplete,
              onEdit: () => setActiveDialog('notes'),
              content: session.notes ? (
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{session.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes added.</p>
              ),
            },
          ]).map((section) => {
            const isOpen = expanded[section.key]
            const isComplete = Boolean((section as any).complete)
            return (
              <div key={section.key} className="rounded-xl border bg-card">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSection(section.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleSection(section.key)
                    }
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  aria-expanded={isOpen}
                >
                  <ChevronRight className={`h-4 w-4 text-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <span className="text-sm font-semibold text-foreground">{section.title}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {section.onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-sm font-medium text-foreground hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation()
                          section.onEdit?.()
                        }}
                        aria-label={`Manage ${section.title.toLowerCase()}`}
                      >
                        Manage
                      </Button>
                    )}
                    <CompletionIndicator complete={isComplete} />
                  </div>
                  {!section.onEdit && <div className="ml-auto h-8 w-[50px]" aria-hidden />}
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1">
                    {section.content}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <SessionDetailsDialog
        open={activeDialog === 'details'}
        onOpenChange={(open) => setActiveDialog(open ? 'details' : null)}
        session={session}
        onUpdated={handleUpdated}
      />
      <SessionDateDialog
        open={dateDialogOpen}
        onOpenChange={setDateDialogOpen}
        session={session}
        onUpdated={handleUpdated}
      />
      <SessionTimeDialog
        open={timeDialogOpen}
        onOpenChange={setTimeDialogOpen}
        session={session}
        onUpdated={handleUpdated}
      />
      <SessionRoomDialog
        open={roomDialogOpen}
        onOpenChange={setRoomDialogOpen}
        session={session}
        onUpdated={handleUpdated}
      />
      <SessionGearDialog
        open={activeDialog === 'resources'}
        onOpenChange={(open) => setActiveDialog(open ? 'resources' : null)}
        session={session}
        onUpdated={handleResourcesUpdated}
        onResourcesChange={handleResourcesUpdated}
      />
      <SessionNotesDialog
        open={activeDialog === 'notes'}
        onOpenChange={(open) => setActiveDialog(open ? 'notes' : null)}
        session={session}
        onUpdated={handleUpdated}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete session</DialogTitle>
            <DialogDescription>
              This will permanently delete the session and its related details. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}

function TeamRow({
  label,
  value,
  source,
  isTbd,
  note,
}: {
  label: string
  value: string
  source?: EngineerSource
  isTbd?: boolean
  note?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
        <span>{value}</span>
        {source && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">
            {source === 'studio' ? 'Studio' : isTbd ? 'External (TBD)' : 'External'}
          </span>
        )}
        {note && <span className="text-xs text-muted-foreground">· {note}</span>}
      </div>
    </div>
  )
}

function CompletionIndicator({ complete }: { complete: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
        complete ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 text-muted-foreground'
      }`}
      aria-hidden
    >
      {complete && <Check className="h-3 w-3" />}
    </span>
  )
}

