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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getRooms, type Room } from '../../settings/rooms/actions'
import { updateSession } from '../actions'
import type { Session } from '@/types/session'

interface SessionRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: Session
  onUpdated?: () => void
}

export function SessionRoomDialog({ open, onOpenChange, session, onUpdated }: SessionRoomDialogProps) {
  const [rooms, setRooms] = React.useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = React.useState(false)
  const [roomId, setRoomId] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setRoomId(session.room_id || '')
      setError(null)
      loadRooms()
    }
    if (!open) {
      setError(null)
    }
  }, [open, session.room_id])

  React.useEffect(() => {
    if (rooms.length > 0 && roomId && !rooms.find((room) => room.id === roomId)) {
      setRoomId('')
    }
  }, [rooms, roomId])

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session.client_id) {
      setError('Session is missing client. Use Edit session details.')
      return
    }
    if (!roomId) {
      setError('Please select a room.')
      return
    }
    if (!rooms.find((room) => room.id === roomId)) {
      setError('Selected room no longer exists. Please select a different room.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await updateSession(session.id, {
        start_at: session.start_time,
        end_at: session.end_time,
        room_id: roomId,
        client_id: session.client_id,
        engineer_id: session.engineer_id ?? null,
      })
      if ('error' in result) {
        setError(result.message)
        toast.error(result.message)
        return
      }
      toast.success('Session room updated')
      onOpenChange(false)
      onUpdated?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update room'
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
          <DialogTitle>Edit room</DialogTitle>
          <DialogDescription>Select the room for this session.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

          <div className="space-y-2">
            <label htmlFor="session-room" className="text-sm font-medium">
              Room
            </label>
            <Select value={roomId} onValueChange={setRoomId} disabled={loading || roomsLoading || rooms.length === 0}>
              <SelectTrigger id="session-room">
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
            {rooms.length === 0 && !roomsLoading && (
              <p className="text-xs text-muted-foreground">Create a room in Settings to continue.</p>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
