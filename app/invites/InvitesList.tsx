'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptPendingInviteById } from '@/actions/acceptPendingInviteById'
import type { PendingInviteSummary } from '@/data/getPendingInvitesForEmail'

interface InvitesListProps {
  invites: PendingInviteSummary[]
}

export default function InvitesList({ invites }: InvitesListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeInviteId, setActiveInviteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = (inviteId: string) => {
    setError(null)
    setActiveInviteId(inviteId)

    startTransition(() => {
      acceptPendingInviteById(inviteId)
        .then((result) => {
          if (result && 'error' in result) {
            setError(result.message)
            setActiveInviteId(null)
            return
          }
          router.push('/dashboard')
          router.refresh()
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to accept invite')
          setActiveInviteId(null)
        })
    })
  }

  if (invites.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any pending invitations right now.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="rounded-lg border border-border bg-background p-6 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">{invite.studio.name}</p>
              <p className="text-sm text-muted-foreground">
                Role: {invite.role}
                {invite.inviter
                  ? ` · Invited by ${invite.inviter.full_name || invite.inviter.email || 'a teammate'}`
                  : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAccept(invite.id)}
              disabled={isPending && activeInviteId === invite.id}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {isPending && activeInviteId === invite.id ? 'Joining...' : 'Accept Invite'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
