'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, CalendarPlus, UserPlus, AudioLines, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { InviteMembersModal } from './InviteMembersModal'
import { GearDetailDrawer } from '../../app/(app)/gear/components/GearDetailDrawer'
import { CreateClientSheet } from '../../app/(app)/clients/components/CreateClientSheet'

/**
 * Create Button Header Component
 * 
 * Global create button that appears in the header.
 * Provides quick access to create actions (Session, Invite, etc.)
 */
export function CreateButtonHeader() {
  const router = useRouter()
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false)
  const [gearModalOpen, setGearModalOpen] = React.useState(false)
  const [clientSheetOpen, setClientSheetOpen] = React.useState(false)
  const [dropdownOpen, setDropdownOpen] = React.useState(false)

  const handleSessionClick = () => {
    setDropdownOpen(false)
    setTimeout(() => {
      router.push('/sessions/new')
    }, 0)
  }

  const handleInviteClick = () => {
    setDropdownOpen(false)
    setTimeout(() => {
      setInviteModalOpen(true)
    }, 0)
  }

  const handleGearClick = () => {
    setDropdownOpen(false)
    setTimeout(() => {
      setGearModalOpen(true)
    }, 0)
  }

  const handleClientClick = () => {
    setDropdownOpen(false)
    setTimeout(() => {
      setClientSheetOpen(true)
    }, 0)
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="h-7 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Create</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-56">
          <DropdownMenuItem onSelect={handleSessionClick}>
            <CalendarPlus className="h-4 w-4" />
            <span>Session</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleGearClick}>
            <AudioLines className="h-4 w-4" />
            <span>Gear</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleClientClick}>
            <Users className="h-4 w-4" />
            <span>Client</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleInviteClick}>
            <UserPlus className="h-4 w-4" />
            <span>Invite</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <InviteMembersModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
      <GearDetailDrawer 
        gear={null} 
        open={gearModalOpen} 
        onOpenChange={setGearModalOpen}
        onGearAdded={() => {}} 
      />
      <CreateClientSheet 
        open={clientSheetOpen} 
        onOpenChange={setClientSheetOpen}
        onClientCreated={() => {}} 
      />
    </>
  )
}
