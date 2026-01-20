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
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { InviteMembersModal } from './InviteMembersModal'
import { GearDetailDrawer } from '../../app/(app)/gear/components/GearDetailDrawer'
import { CreateClientSheet } from '../../app/(app)/clients/components/CreateClientSheet'

/**
 * Global Create Menu Component
 * 
 * Asana-style global create button that appears in the sidebar header.
 * Provides quick access to create actions (Session, Invite, etc.)
 */
export function GlobalCreateMenu() {
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
    // Close dropdown first to avoid portal conflict
    setDropdownOpen(false)
    // Small delay to ensure dropdown portal closes before modal portal opens
    setTimeout(() => {
      setInviteModalOpen(true)
    }, 0)
  }

  const handleGearClick = () => {
    // Close dropdown first to avoid portal conflict
    setDropdownOpen(false)
    // Small delay to ensure dropdown portal closes before modal portal opens
    setTimeout(() => {
      setGearModalOpen(true)
    }, 0)
  }

  const handleClientClick = () => {
    // Close dropdown first to avoid portal conflict
    setDropdownOpen(false)
    // Small delay to ensure dropdown portal closes before sheet portal opens
    setTimeout(() => {
      setClientSheetOpen(true)
    }, 0)
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton size="lg" className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-sm border border-primary/20 !h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-2">
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">Create</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" sideOffset={8} className="w-56">
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
