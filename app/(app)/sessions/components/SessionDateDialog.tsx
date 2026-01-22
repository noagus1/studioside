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

interface SessionDateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: Session
  onUpdated?: () => void
}

const toDateInputValue = (value: Date) => value.toLocaleDateString('en-CA')
const toTimeInputValue = (value: Date) =>
  value.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })

export function SessionDateDialog({ open, onOpenChange, session, onUpdated }: SessionDateDialogProps) {
  const [date, setDate] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const durationMinutes = React.useMemo(() => {
    const start = new Date(session.start_time)
    const end = new Date(session.end_time)
    const diff = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
    return diff
  }, [session.end_time, session.start_time])

  React.useEffect(() => {
    if (open) {
      setDate(toDateInputValue(new Date(session.start_time)))
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

    if (!date) {
      setError('Please choose a date.')
      return
    }

    const baseStart = new Date(session.start_time)
    const timeValue = toTimeInputValue(baseStart)
    const start = new Date(`${date}T${timeValue}`)
    if (Number.isNaN(start.getTime())) {
      setError('Invalid date.')
      return
    }

    const end = new Date(start.getTime() + durationMinutes * 60000)

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
      toast.success('Session date updated')
      onOpenChange(false)
      onUpdated?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update session date'
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
          <DialogTitle>Edit session date</DialogTitle>
          <DialogDescription>Choose a new session date. Time and duration stay the same.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          <div className="space-y-2">
            <label htmlFor="session-date" className="text-sm font-medium">
              Date
            </label>
            <Input
              id="session-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save date'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
