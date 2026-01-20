'use client'

import * as React from 'react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Mail, MoreHorizontal, Trash2, UserCog, RefreshCcw, ShieldCheck, ChevronUp, ChevronDown } from 'lucide-react'
import { getTeamData, type TeamData, type TeamDataError, type TeamMember, type PendingInvite } from '@/actions/getTeamData'
import { revokeStudioInvite } from '@/actions/revokeStudioInvite'
import { resendStudioInvite } from '@/actions/resendStudioInvite'
import { updateMembershipRole } from '@/actions/updateMembershipRole'
import { removeStudioMember } from '@/actions/removeStudioMember'
import { useSettingsCache } from '@/components/settings/SettingsCacheProvider'
import type { MembershipRole } from '@/types/db'
import { cn } from '@/lib/utils'

interface TeamSectionProps {
  initialData?: TeamData | TeamDataError
  isAdmin: boolean
  currentRole: string | null
  className?: string
}

const roleWeight: Record<string, number> = {
  owner: 0,
  admin: 1,
  member: 2,
}

export default function TeamSection({
  initialData,
  isAdmin,
  currentRole: _currentRole,
  className,
}: TeamSectionProps) {
  const { refreshCache, getCachedStudioSettings } = useSettingsCache()
  const [data, setData] = React.useState<TeamData | TeamDataError | null>(initialData || null)
  const [loading, setLoading] = React.useState(!initialData)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [memberToRemove, setMemberToRemove] = React.useState<TeamMember | null>(null)

  const studioName = React.useMemo(() => {
    const cached = getCachedStudioSettings?.()
    return cached?.studio?.name?.trim() || 'studio'
  }, [getCachedStudioSettings])

  const isError = data && 'error' in data
  const teamData = data && !('error' in data) ? data : null

  const refresh = React.useCallback(async () => {
    setLoading(true)
    const result = await getTeamData()
    setData(result)
    setLoading(false)
    refreshCache()
  }, [refreshCache])

  React.useEffect(() => {
    if (!initialData) {
      refresh()
    }
  }, [initialData, refresh])

  const handleResend = async (invite: PendingInvite) => {
    setBusyId(invite.id)
    const result = await resendStudioInvite(invite.id)
    if ('error' in result) {
      toast.error(result.message)
    } else {
      toast.success('Invite resent')
      try {
        await navigator.clipboard.writeText(result.inviteUrl)
        toast.success('Invite link copied')
      } catch {
        /* ignore clipboard failure */
      }
      await refresh()
    }
    setBusyId(null)
  }

  const handleCancelInvite = async (invite: PendingInvite) => {
    setBusyId(invite.id)
    const result = await revokeStudioInvite(invite.id)
    if ('error' in result) {
      toast.error(result.message)
    } else {
      toast.success('Invitation cancelled')
      await refresh()
    }
    setBusyId(null)
  }

  const handleChangeRole = async (member: TeamMember, role: MembershipRole) => {
    if (member.role === role) return
    setBusyId(member.id)
    const result = await updateMembershipRole(member.id, role)
    if ('error' in result) {
      toast.error(result.message)
    } else {
      toast.success('Role updated')
      await refresh()
    }
    setBusyId(null)
  }

  const handleRemoveMember = async (member: TeamMember) => {
    setBusyId(member.id)
    const result = await removeStudioMember(member.id)
    if ('error' in result) {
      toast.error(result.message)
    } else {
      toast.success('Member removed')
      await refresh()
    }
    setBusyId(null)
  }

  const isBusy = (id: string) => busyId === id

  if (loading) {
    return (
      <div className={cn(className ?? 'pl-10 pr-10 pt-6 pb-6 space-y-4')}>
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (isError || !teamData) {
    return (
      <div className={cn(className ?? 'pl-10 pr-10 pt-6 pb-6')}>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {isError ? data.message : 'Unable to load team'}
        </div>
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={refresh}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const activeMembers = teamData.members.filter((member) => member.status === 'active')
  const pendingInvites = teamData.pendingInvites || []

  const sortedMembers = [...activeMembers].sort((a, b) => {
    const nameA = (a.user.full_name || a.user.email || '').toLowerCase()
    const nameB = (b.user.full_name || b.user.email || '').toLowerCase()
    const comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return
    await handleRemoveMember(memberToRemove)
    setMemberToRemove(null)
  }


  const filteredMembers = normalizedSearch
    ? sortedMembers.filter((member) => {
        const name = (member.user.full_name || member.user.email || '').toLowerCase()
        const email = (member.user.email || '').toLowerCase()
        return name.includes(normalizedSearch) || email.includes(normalizedSearch)
      })
    : sortedMembers

  const filteredInvites = normalizedSearch
    ? pendingInvites.filter((invite) => invite.email.toLowerCase().includes(normalizedSearch))
    : pendingInvites

  const renderRoleLabel = (member: TeamMember) => {
    if (member.role === 'owner') return 'Owner'
  if (member.role === 'admin') return 'Manager'
    return 'Member'
  }

  const renderMemberRow = (member: TeamMember) => {
    const isCurrentUser = member.user.id === teamData.currentUserId
    const roleLabel = renderRoleLabel(member)
    const allowRoleChange = isAdmin && member.role !== 'owner'
    const allowRemoval = isAdmin && member.role !== 'owner' && member.user.id !== teamData.currentUserId
    const activityDate = member.last_sign_in_at || member.joined_at
    const lastActive = activityDate
      ? member.last_sign_in_at
        ? formatDistanceToNowStrict(new Date(activityDate), { addSuffix: true })
        : `Joined ${formatDistanceToNowStrict(new Date(activityDate), { addSuffix: true })}`
      : 'No activity yet'
    const email = member.user.email || 'No email on file'
    const displayName = member.user.full_name || member.user.email || 'Unknown user'

    return (
      <div
        key={`member-${member.id}`}
        className="grid grid-cols-[minmax(0,2.3fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.7fr)] items-center gap-3 px-4 py-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={member.user.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="text-sm">
              {(member.user.full_name || member.user.email || '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-sm font-medium">
                {isCurrentUser ? `${displayName} (You)` : displayName}
              </span>
            </div>
            <div className="truncate text-sm text-muted-foreground">{email}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground/90">
          <span className="capitalize text-foreground">{roleLabel}</span>
        </div>

        <div className="text-sm text-muted-foreground">{lastActive}</div>

        <div className="flex items-center justify-end">
          {allowRoleChange || allowRemoval ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isBusy(member.id)} aria-label="Member actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => handleChangeRole(member, 'admin')}
                  disabled={member.role === 'admin' || isBusy(member.id)}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Make manager
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleChangeRole(member, 'member')}
                  disabled={member.role === 'member' || isBusy(member.id)}
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Make member
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setMemberToRemove(member)}
                  disabled={!allowRemoval || isBusy(member.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="h-9 w-6" />
          )}
        </div>
      </div>
    )
  }

  const renderInviteRow = (invite: PendingInvite) => {
    const expiresText = `Expires ${format(new Date(invite.expires_at), 'MMM d')}`
    const sentAgo = formatDistanceToNowStrict(new Date(invite.created_at), { addSuffix: true })

    return (
      <div
        key={`invite-${invite.id}`}
        className="grid grid-cols-[minmax(0,2.3fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.7fr)] items-center gap-3 px-4 py-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-sm font-medium">{invite.email}</span>
              <Badge variant="outline" className="text-[11px]">Invite</Badge>
            </div>
            <div className="truncate text-sm text-muted-foreground">Pending invite</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground/90">
          <span className="capitalize text-foreground">{invite.role}</span>
          <span className="text-[12px] text-muted-foreground/80">Pending</span>
        </div>

        <div className="text-sm text-muted-foreground space-y-0.5">
          <div>Sent {sentAgo}</div>
          <div className="text-[11px] text-muted-foreground/80">{expiresText}</div>
        </div>

        <div className="flex items-center justify-end">
          {isAdmin ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleResend(invite)}
                disabled={isBusy(invite.id)}
                aria-label="Resend invite"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleCancelInvite(invite)}
                disabled={isBusy(invite.id)}
                aria-label="Cancel invite"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          ) : (
            <div className="h-9 w-6" />
          )}
        </div>
      </div>
    )
  }

  const hasRows = filteredMembers.length > 0 || filteredInvites.length > 0

  return (
    <div className={cn(className ?? 'pl-10 pr-10 pt-6 pb-6')}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search team members`}
            className="w-full"
          />
        </div>

        <div className="rounded-lg border border-border/70 overflow-hidden">
          <div className="grid grid-cols-[minmax(0,2.3fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.7fr)] items-center gap-3 bg-muted/40 px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/80">
            <button
              type="button"
              onClick={toggleSortDirection}
              className="flex items-center gap-1 text-left uppercase tracking-wide text-muted-foreground/80"
              aria-label={`Sort by name ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            >
              <span>Name</span>
              {sortDirection === 'asc' ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/80" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/80" />
              )}
            </button>
            <div>Account type</div>
            <div>Last active</div>
            <div className="text-right" aria-hidden>
              {/* actions column */}
            </div>
          </div>
          {hasRows ? (
            <div className="divide-y divide-border">
              {filteredMembers.map(renderMemberRow)}
              {filteredInvites.map(renderInviteRow)}
            </div>
          ) : (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              {isAdmin
                ? 'No members yet. Invite your first teammate to get started.'
                : 'No members to show.'}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              {memberToRemove
                ? `Remove ${memberToRemove.user.full_name || memberToRemove.user.email || 'this user'} from the studio?`
                : 'Remove this member from the studio?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToRemove(null)} disabled={memberToRemove ? isBusy(memberToRemove.id) : false}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoveMember}
              disabled={!memberToRemove || isBusy(memberToRemove.id)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

