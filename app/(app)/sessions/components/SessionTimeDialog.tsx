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
import { updateSession } from '../actions'
import type { Session } from '@/types/session'

interface SessionTimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: Session
  onUpdated?: () => void
}

const toDateInputValue = (value: Date) => value.toLocaleDateString('en-CA')
const toTimeInputValue = (value: Date) =>
  value.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })

export function SessionTimeDialog({ open, onOpenChange, session, onUpdated }: SessionTimeDialogProps) {
  const [startTime, setStartTime] = React.useState('')
  const [endTime, setEndTime] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const sessionDate = React.useMemo(() => toDateInputValue(new Date(session.start_time)), [session.start_time])
  const durationMinutes = React.useMemo(() => {
    const start = new Date(session.start_time)
    const end = new Date(session.end_time)
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
  }, [session.end_time, session.start_time])

  React.useEffect(() => {
    if (open) {
      setStartTime(toTimeInputValue(new Date(session.start_time)))
      setEndTime('')
      setError(null)
    }
    if (!open) {
      setError(null)
    }
  }, [open, session.start_time])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session.room_id || !session.client_id) {
      setError('Session is missing room or client. Use Edit session details.')
      return
    }
    if (!startTime) {
      setError('Please choose a start time.')
      return
    }

    const start = new Date(`${sessionDate}T${startTime}`)
    if (Number.isNaN(start.getTime())) {
      setError('Invalid start time.')
      return
    }

    let end: Date
    if (endTime) {
      const manual = new Date(`${sessionDate}T${endTime}`)
      if (Number.isNaN(manual.getTime())) {
        setError('Invalid end time.')
        return
      }
      end = manual
      if (end.getTime() <= start.getTime()) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
      }
    } else {
      end = new Date(start.getTime() + durationMinutes * 60000)
    }

    setLoading(true)
    setError(null)
    try {
      const result = await updateSession(session.id, {
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        room_id: session.room_id,
        client_id: session.client_id,
        engineer_id: session.engineer_id ?? null,
      })
      if ('error' in result) {
        setError(result.message)
        toast.error(result.message)
        return
      }
      toast.success('Session time updated')
      onOpenChange(false)
      onUpdated?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update session time'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit session time</DialogTitle>
          <DialogDescription>Pick a new start time. Optionally set an end time.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          <div className="space-y-2">
            <label htmlFor="session-start-time" className="text-sm font-medium">
              Start time
            </label>
            <Input
              id="session-start-time"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="session-end-time" className="text-sm font-medium">
                End time (optional)
              </label>
              {endTime && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setEndTime('')}
                  disabled={loading}
                >
                  Keep duration
                </Button>
              )}
            </div>
            <Input
              id="session-end-time"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              disabled={loading}
              placeholder="HH:MM"
            />
            <p className="text-xs text-muted-foreground">Leave blank to keep the same duration.</p>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save time'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
