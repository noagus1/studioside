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
import { createClient, type Client } from '../actions'

interface CreateClientSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientCreated: (client: Client) => void
}

export function CreateClientSheet({ open, onOpenChange, onClientCreated }: CreateClientSheetProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setName('')
      setError(null)
      setLoading(false)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate name
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Client name is required')
      setLoading(false)
      return
    }

    try {
      const result = await createClient({
        name: trimmedName,
      })

      if ('error' in result) {
        setError(result.message)
        toast.error(result.message)
        setLoading(false)
        return
      }

      // Success
      toast.success('Client created successfully')
      onClientCreated(result.client)
      
      // Reset form and loading state
      setName('')
      setError(null)
      setLoading(false)
      
      // Close sheet
      onOpenChange(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create client'
      setError(errorMessage)
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  const isNameValid = name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Client</DialogTitle>
          <DialogDescription>Add a new client to your studio</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter client name"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isNameValid}>
              {loading ? 'Creating...' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}








