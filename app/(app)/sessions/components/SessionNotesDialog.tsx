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
import { Textarea } from '@/components/ui/textarea'
import { updateSession } from '../actions'
import type { Session } from '@/types/session'

interface SessionNotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: Session
  onUpdated?: () => void
}

export function SessionNotesDialog({ open, onOpenChange, session, onUpdated }: SessionNotesDialogProps) {
  const [notes, setNotes] = React.useState(session.notes ?? '')
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setNotes(session.notes ?? '')
    }
  }, [open, session.notes])

  const handleSave = async () => {
    setLoading(true)
    try {
      if (!session.room_id || !session.client_id) {
        toast.error('Session is missing required room or client')
        setLoading(false)
        return
      }

      const result = await updateSession(session.id, {
        start_at: session.start_time,
        end_at: session.end_time,
        room_id: session.room_id,
        client_id: session.client_id,
        engineer_id: session.engineer_id || null,
        notes: notes.trim() ? notes : null,
      })

      if ('error' in result) {
        toast.error(result.message)
        setLoading(false)
        return
      }

      toast.success('Notes updated')
      onOpenChange(false)
      onUpdated?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update notes'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit notes</DialogTitle>
          <DialogDescription>Add context for this session.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any quick context for the session."
            rows={6}
            disabled={loading}
          />
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save notes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


