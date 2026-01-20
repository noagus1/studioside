'use client'

/**
 * Welcome Studio Modal
 * 
 * Shows a welcome message after studio creation, prompting users to add a room or invite team members.
 * Modal cannot be dismissed - user must complete one action.
 */

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface WelcomeStudioModalProps {
  open: boolean
  studioName: string
}

export function WelcomeStudioModal({ open, studioName }: WelcomeStudioModalProps) {
  const router = useRouter()

  const handleAddRoom = () => {
    // Open settings modal to rooms section and trigger create
    // Store a flag in sessionStorage to auto-open create drawer
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('welcome-create-room', 'true')
    }
    router.push('/settings/rooms')
  }

  const handleInviteTeam = () => {
    // Navigate to team settings to invite members
    router.push('/settings/team')
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to {studioName}!</DialogTitle>
          <DialogDescription className="text-base pt-2">
            You&apos;re all set 🎉
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-6">
            Get started by adding your first room or inviting your team members.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleAddRoom}
              className="w-full"
              size="lg"
            >
              Add Room
            </Button>
            <Button
              onClick={handleInviteTeam}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Invite Team
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
