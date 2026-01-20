'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit2, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type Client, deleteClient, updateClient } from '../actions'
import { type Session } from '@/types/session'
import { PastSessionsList } from './components/PastSessionsList'
import { ClientInfoSection } from './components/ClientInfoSection'
import { EditSessionSheet } from '../../sessions/components/EditSessionSheet'

interface ClientDetailClientProps {
  initialClient: Client
  initialSessions: Session[]
}

/**
 * Generates initials from a client name
 */
function getClientInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  } else if (words.length === 1 && words[0].length >= 2) {
    return words[0].substring(0, 2).toUpperCase()
  } else if (words.length === 1) {
    return words[0].toUpperCase()
  }
  return '??'
}

export function ClientDetailClient({ initialClient, initialSessions }: ClientDetailClientProps) {
  const router = useRouter()
  const [client, setClient] = React.useState<Client>(initialClient)
  const [sessions, setSessions] = React.useState<Session[]>(initialSessions)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [editSessionSheetOpen, setEditSessionSheetOpen] = React.useState(false)
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null)
  const [isEditingName, setIsEditingName] = React.useState(false)
  const [nameDraft, setNameDraft] = React.useState(client.name)
  const [isSavingName, setIsSavingName] = React.useState(false)
  const [nameError, setNameError] = React.useState<string | null>(null)

  // Handle client update (optimistic update)
  const handleClientUpdated = React.useCallback((updatedClient: Client) => {
    setClient(updatedClient)
  }, [])

  // Handle delete client
  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteClient(client.id)

      if ('error' in result) {
        toast.error(result.message)
        setIsDeleting(false)
        return
      }

      toast.success('Client deleted successfully')
      router.push('/clients')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete client'
      toast.error(errorMessage)
      setIsDeleting(false)
    }
  }

  const handleSessionClick = React.useCallback((session: Session) => {
    setSelectedSession(session)
    setEditSessionSheetOpen(true)
  }, [])

  const handleSessionUpdated = React.useCallback(() => {
    setEditSessionSheetOpen(false)
    setSelectedSession(null)
    router.refresh()
  }, [router])

  // Keep local name draft in sync when client changes or edit mode closes
  React.useEffect(() => {
    if (!isEditingName) {
      setNameDraft(client.name)
      setNameError(null)
    }
  }, [client, isEditingName])

  const handleStartNameEdit = () => {
    setIsEditingName(true)
    setNameError(null)
  }

  const handleCancelNameEdit = () => {
    setIsEditingName(false)
    setNameDraft(client.name)
    setNameError(null)
  }

  const handleSaveName = async () => {
    const trimmedName = nameDraft.trim()

    if (!trimmedName) {
      setNameError('Client name is required')
      return
    }

    if (trimmedName === client.name) {
      setIsEditingName(false)
      return
    }

    setIsSavingName(true)
    setNameError(null)

    try {
      const result = await updateClient(client.id, { name: trimmedName })

      if ('error' in result) {
        setNameError(result.message)
        toast.error(result.message)
        setIsSavingName(false)
        return
      }

      toast.success('Client updated successfully')
      handleClientUpdated(result.client)
      setIsEditingName(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update client'
      setNameError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSavingName(false)
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSavingName) {
      handleSaveName()
    } else if (e.key === 'Escape') {
      handleCancelNameEdit()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Client Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-muted text-muted-foreground text-lg">
              {getClientInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            {isEditingName ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  disabled={isSavingName}
                  autoFocus
                  className="h-12 max-w-xl text-3xl font-bold"
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={isSavingName || !nameDraft.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingName ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelNameEdit}
                  disabled={isSavingName}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{client.name}</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleStartNameEdit}
                  className="h-8 w-8"
                >
                  <Edit2 className="h-4 w-4" />
                  <span className="sr-only">Edit name</span>
                </Button>
              </div>
            )}
            {nameError && <p className="text-sm text-destructive">{nameError}</p>}
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Past Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div>
            <ClientInfoSection client={client} />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
            <PastSessionsList sessions={sessions.slice(0, 5)} onSessionClick={handleSessionClick} />
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-4">Past Sessions</h2>
            <PastSessionsList sessions={sessions} onSessionClick={handleSessionClick} />
          </div>
        </TabsContent>
      </Tabs>

      <EditSessionSheet
        open={editSessionSheetOpen}
        onOpenChange={setEditSessionSheetOpen}
        session={selectedSession}
        onSessionUpdated={handleSessionUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{client.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
