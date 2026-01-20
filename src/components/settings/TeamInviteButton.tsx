'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { InviteMembersModal } from '@/components/InviteMembersModal'

interface TeamInviteButtonProps {
  isAdmin: boolean
}

export function TeamInviteButton({ isAdmin }: TeamInviteButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        variant="outline"
        className="min-w-[140px]"
        onClick={() => setOpen(true)}
        disabled={!isAdmin}
      >
        Invite member
      </Button>
      <InviteMembersModal open={open} onOpenChange={setOpen} />
    </>
  )
}
