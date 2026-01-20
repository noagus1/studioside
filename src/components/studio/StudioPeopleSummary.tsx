'use client'

import * as React from 'react'
import { Users, ShieldCheck, UserRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { InviteMembersModal } from '@/components/InviteMembersModal'
import type { TeamData, TeamMember } from '@/actions/getTeamData'

interface StudioPeopleSummaryProps {
  data: TeamData
  canInvite: boolean
  onViewMembers?: () => void
}

const roleWeight: Record<string, number> = {
  owner: 0,
  admin: 1,
  member: 2,
}

export function StudioPeopleSummary({ data, canInvite, onViewMembers }: StudioPeopleSummaryProps) {
  const [inviteOpen, setInviteOpen] = React.useState(false)

  const activeMembers = (data.members || []).filter((member) => member.status === 'active')

  const sortedMembers = [...activeMembers].sort((a, b) => {
    const roleA = roleWeight[a.role] ?? 3
    const roleB = roleWeight[b.role] ?? 3
    if (roleA !== roleB) return roleA - roleB
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
  })

  const visibleMembers = sortedMembers.slice(0, 5)
  const remaining = Math.max(sortedMembers.length - visibleMembers.length, 0)

  const counts = sortedMembers.reduce(
    (acc, member) => {
      if (member.role === 'owner') acc.owners += 1
    else if (member.role === 'admin') acc.admins += 1
      else acc.members += 1
      return acc
    },
    { owners: 0, admins: 0, members: 0 }
  )

  const renderRoleLabel = (member: TeamMember) => {
    if (member.role === 'owner') return 'Owner'
  if (member.role === 'admin') return 'Manager'
    return 'Member'
  }

  return (
    <>
      <Card className="shadow-none border-border/60 rounded-lg">
        <CardHeader className="flex flex-col gap-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-[15px] font-semibold">People</CardTitle>
            <p className="text-sm text-muted-foreground/85">
              A quick glance at who&apos;s in the studio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onViewMembers ? (
              <Button variant="ghost" size="sm" onClick={onViewMembers}>
                Open team
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link href="/team">Open team</Link>
              </Button>
            )}
            {canInvite && (
              <Button onClick={() => setInviteOpen(true)} size="sm">
                Invite
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground/85">
            <div className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1">
              <Users className="h-4 w-4" />
              <span>{sortedMembers.length} {sortedMembers.length === 1 ? 'person' : 'people'}</span>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1">
              <ShieldCheck className="h-4 w-4" />
              <span>
                {counts.admins} {counts.admins === 1 ? 'manager' : 'managers'}
              </span>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1">
              <UserRound className="h-4 w-4" />
              <span>{counts.members} {counts.members === 1 ? 'member' : 'members'}</span>
            </div>
            {data.pendingInvites?.length ? (
              <Badge variant="outline" className="text-xs">
                {data.pendingInvites.length} pending invite{data.pendingInvites.length > 1 ? 's' : ''}
              </Badge>
            ) : null}
          </div>

          {visibleMembers.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
              No members yet. {canInvite ? 'Send an invite to start your team.' : 'Ask the studio owner to invite teammates.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleMembers.map((member) => {
                const displayName = member.user.full_name || member.user.email || 'Unknown user'
                const isCurrentUser = member.user.id === data.currentUserId

                return (
                  <div key={member.id} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user.avatar_url || undefined} alt={displayName} />
                      <AvatarFallback className="text-sm">
                        {(member.user.full_name || member.user.email || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {isCurrentUser ? `${displayName} (You)` : displayName}
                        </p>
                        <Badge variant="secondary" className="text-[11px] capitalize">
                          {renderRoleLabel(member)}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.user.email || 'No email on file'}
                      </p>
                    </div>
                  </div>
                )
              })}
              {remaining > 0 && (
                <div className="flex items-center justify-center rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  +{remaining} more teammates
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <InviteMembersModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  )
}
