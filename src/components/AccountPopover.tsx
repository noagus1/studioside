'use client'

import * as React from 'react'
import Link from 'next/link'
import { Users, LogOut, ChevronsUpDown, Settings, Sparkles } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { logout } from '@/actions/logout'
import type { UserProfile } from '@/data/getUserProfile'
import type { MembershipRole } from '@/types/db'

interface AccountPopoverProps {
  user: UserProfile
  role: MembershipRole | null
}

/**
 * Account Popover Component
 * 
 * Displays user account information and actions in a popover menu.
 * Trigger shows avatar and full name at the bottom of the sidebar.
 */
export default function AccountPopover({ user, role }: AccountPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const isOwnerOrAdmin = role === 'owner' || role === 'admin'

  // Get initials for avatar fallback
  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Format role for display
  const getRoleDisplay = (role: MembershipRole | null) => {
    if (!role) return 'Member'
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  const handleLogout = async () => {
    setOpen(false)
    await logout()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent"
        >
          <Avatar className="h-8 w-8 shrink-0 rounded-full">
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || ''} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs hover:bg-sidebar-primary/90 transition-colors">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col items-start text-left min-w-0">
            <span className="text-sm font-medium truncate w-full">
              {user.full_name || user.email || 'User'}
            </span>
            {user.full_name && (
              <span className="text-xs text-sidebar-foreground/70 truncate w-full">
                {getRoleDisplay(role)}
              </span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 rounded-xl shadow-lg"
        align="end"
        side="right"
        sideOffset={8}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || ''} />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col min-w-0">
              <span className="text-sm font-medium truncate">
                {user.full_name || user.email || 'User'}
              </span>
              {user.email && (
                <span className="text-xs text-muted-foreground truncate">
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </div>
        <Separator />
        <div className="p-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9 px-2 text-sm font-normal"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link href="/upgrade">
              <Sparkles className="h-4 w-4" />
              <span>Upgrade Plan</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9 px-2 text-sm font-normal"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link href="/account/profile">
              <Settings className="h-4 w-4" />
              <span>Account Settings</span>
            </Link>
          </Button>
          <Separator className="my-1" />
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9 px-2 text-sm font-normal text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

