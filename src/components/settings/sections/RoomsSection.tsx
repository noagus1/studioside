'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Plus, DoorOpen, Loader2, MoreVertical, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getRooms, updateRoom, deleteRoom, type Room } from '../../../../app/(app)/settings/rooms/actions'
import type { MembershipRole } from '@/types/db'
import { RoomDetailDrawer } from './RoomDetailDrawer'

interface RoomsSectionProps {
  userRole: MembershipRole | null
}

export default function RoomsSection({ userRole }: RoomsSectionProps) {
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin'

  // Rooms state
  const [loadingRooms, setLoadingRooms] = React.useState(true)
  const [rooms, setRooms] = React.useState<Room[]>([])
  const [togglingRoomId, setTogglingRoomId] = React.useState<string | null>(null)
  
  // Room detail drawer state
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [selectedRoom, setSelectedRoom] = React.useState<Room | null>(null)
  
  // Delete confirmation state
  const [deletingRoomId, setDeletingRoomId] = React.useState<string | null>(null)
  const [deletingRoomName, setDeletingRoomName] = React.useState<string>('')

  // Handle open room detail drawer
  const handleOpenRoomDetail = (room: Room | null) => {
    setSelectedRoom(room)
    setDrawerOpen(true)
  }

  // Check for query param or sessionStorage flag to auto-open create drawer
  React.useEffect(() => {
    // Check sessionStorage for welcome-create-room flag
    if (typeof window !== 'undefined') {
      const shouldCreate = sessionStorage.getItem('welcome-create-room')
      if (shouldCreate === 'true' && isOwnerOrAdmin) {
        // Clear the flag
        sessionStorage.removeItem('welcome-create-room')
        // Open create drawer
        handleOpenRoomDetail(null)
      }
    }
  }, [isOwnerOrAdmin])

  // Load rooms
  React.useEffect(() => {
    async function loadRooms() {
      setLoadingRooms(true)
      try {
        const result = await getRooms()
        if ('success' in result && result.success) {
          setRooms(result.rooms)
        } else {
          toast.error('error' in result ? result.message : 'Failed to load rooms')
          setRooms([])
        }
      } catch (error) {
        toast.error('Failed to load rooms')
        console.error(error)
        setRooms([])
      } finally {
        setLoadingRooms(false)
      }
    }
    loadRooms()
  }, [])

  // Handle toggle room active/inactive
  const handleToggleRoomActive = async (room: Room) => {
    if (togglingRoomId) return // Prevent double toggle

    setTogglingRoomId(room.id)
    const newActiveState = !room.is_active

    // Optimistic update
    setRooms(rooms.map((r) => (r.id === room.id ? { ...r, is_active: newActiveState } : r)))

    try {
      const result = await updateRoom(room.id, { is_active: newActiveState })
      if ('success' in result && result.success) {
        setRooms(rooms.map((r) => (r.id === room.id ? result.room : r)))
        toast.success(`Room ${newActiveState ? 'activated' : 'deactivated'} successfully`)
      } else {
        // Revert optimistic update
        setRooms(rooms.map((r) => (r.id === room.id ? { ...r, is_active: room.is_active } : r)))
        toast.error('error' in result ? result.message : 'Failed to update room')
      }
    } catch (error) {
      // Revert optimistic update
      setRooms(rooms.map((r) => (r.id === room.id ? { ...r, is_active: room.is_active } : r)))
      toast.error('Failed to update room')
      console.error(error)
    } finally {
      setTogglingRoomId(null)
    }
  }

  // Handle room saved (from drawer)
  const handleRoomSaved = (room: Room) => {
    if (selectedRoom) {
      // Update existing room
      setRooms(rooms.map((r) => (r.id === room.id ? room : r)))
    } else {
      // Add new room
      setRooms([...rooms, room])
    }
    setDrawerOpen(false)
    setSelectedRoom(null)
  }

  // Handle delete room
  const handleDeleteRoom = async () => {
    if (!deletingRoomId) return

    try {
      const result = await deleteRoom(deletingRoomId)
      if ('success' in result && result.success) {
        setRooms(rooms.filter((r) => r.id !== deletingRoomId))
        toast.success('Room deleted successfully')
      } else {
        toast.error('error' in result ? result.message : 'Failed to delete room')
      }
    } catch (error) {
      toast.error('Failed to delete room')
      console.error(error)
    } finally {
      setDeletingRoomId(null)
      setDeletingRoomName('')
    }
  }

  // Handle open delete confirmation
  const handleOpenDeleteDialog = (room: Room) => {
    setDeletingRoomId(room.id)
    setDeletingRoomName(room.name)
  }

  if (loadingRooms) {
    return (
      <div className="pl-10 pr-10 pt-6 pb-6 space-y-6">
        <Card className="shadow-none">
          <CardContent className="p-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-64 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex-1 max-w-md">
                  <div className="h-10 w-full bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="pl-10 pr-10 pt-6 pb-6 space-y-6">
      {!isOwnerOrAdmin && (
        <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          You can view rooms for this studio. Admins can add, edit, or delete rooms.
        </div>
      )}
      {/* Rooms Card */}
      <Card className="shadow-none">
        <CardContent className="p-0">
          {/* Rooms List */}
          <div className="space-y-0">
            {rooms.length === 0 ? (
              <>
                <div className="text-center py-8 text-muted-foreground px-6">
                  <DoorOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No rooms added yet</p>
                  <p className="text-sm mt-2">Add your first room to get started</p>
                </div>
                {/* Add Room Cell - shown even when empty */}
                {isOwnerOrAdmin && (
                  <div
                    onClick={() => handleOpenRoomDetail(null)}
                    className="flex items-center justify-between py-4 px-6 border-t cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 flex items-center gap-3">
                      <Plus className="h-5 w-5 text-primary" />
                      <span className="font-medium text-muted-foreground">Add Room</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </>
            ) : (
              <>
                {rooms.map((room, index) => (
                  <div
                    key={room.id}
                    className={`flex items-center justify-between py-4 px-6 ${
                      index < rooms.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    <div className="flex-1 flex items-center gap-3">
                      <DoorOpen className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{room.name}</span>
                    </div>
                    <div className="flex-1 max-w-md flex items-center justify-end gap-3">
                      <span className="text-sm text-muted-foreground">
                        {room.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {isOwnerOrAdmin ? (
                        <Switch
                          checked={room.is_active}
                          onCheckedChange={() => handleToggleRoomActive(room)}
                          disabled={togglingRoomId === room.id}
                        />
                      ) : (
                        <Switch checked={room.is_active} disabled className="opacity-50" />
                      )}
                      {togglingRoomId === room.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {isOwnerOrAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-60 hover:opacity-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenRoomDetail(room)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenDeleteDialog(room)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
                {/* Add Room Cell - at bottom */}
                {isOwnerOrAdmin && (
                  <div
                    onClick={() => handleOpenRoomDetail(null)}
                    className="flex items-center justify-between py-4 px-6 border-t cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 flex items-center gap-3">
                      <Plus className="h-5 w-5 text-primary" />
                      <span className="font-medium text-muted-foreground">Add Room</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Room Detail Drawer */}
      <RoomDetailDrawer
        room={selectedRoom}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRoomSaved={handleRoomSaved}
        userRole={userRole}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingRoomId !== null} onOpenChange={(open) => !open && setDeletingRoomId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Room</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingRoomName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRoomId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteRoom}
              variant="destructive"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
