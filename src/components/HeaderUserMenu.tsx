'use client'

import * as React from 'react'
import Link from 'next/link'
import { User, Settings } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { UserProfile } from '@/data/getUserProfile'
import type { MembershipRole } from '@/types/db'

type HeaderUserMenuProps = {
  userProfile?: UserProfile | null
  role?: MembershipRole | null
}

const getInitials = (name: string | null) => {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function HeaderUserMenu({ userProfile, role }: HeaderUserMenuProps) {
  const [open, setOpen] = React.useState(false)

  const closeMenu = () => setOpen(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full p-0 border border-border/70"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.full_name || ''} />
            <AvatarFallback className="text-xs font-medium">
              {getInitials(userProfile?.full_name || null)}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">
            {role ? `Open ${role} account menu` : 'Open account menu'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={4}
        className="p-0 rounded-xl shadow-lg min-w-[220px] border"
      >
        <div className="flex flex-col gap-1 p-1">
          <div className="rounded-lg border bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground font-medium">Signed in</p>
            <p className="text-sm font-medium text-foreground truncate">
              {userProfile?.email || 'user@example.com'}
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9 px-2 text-sm font-normal"
            asChild
            onClick={closeMenu}
          >
            <Link href="/account/profile">
              <User className="h-4 w-4" />
              <span>Account</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9 px-2 text-sm font-normal"
            asChild
            onClick={closeMenu}
          >
            <Link href="/settings">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
