'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Clock, MoreVertical, Copy, Trash2, UserCog, Crown, Mail } from 'lucide-react'
import { getTeamData, type TeamData, type TeamDataError } from '@/actions/getTeamData'
import { revokeStudioInvite } from '@/actions/revokeStudioInvite'
import { removeStudioMember } from '@/actions/removeStudioMember'
import { createStudioInvite } from '@/actions/createStudioInvite'
import { getCurrentStudioId } from '@/actions/getCurrentStudioId'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TeamMember, PendingInvite } from '@/actions/getTeamData'
import type { MembershipRole } from '@/types/db'

export function TeamSection() {
  const [data, setData] = React.useState<TeamData | TeamDataError | null>(null)
  const [loading, setLoading] = React.useState(true)
  
  // Invite flow state
  const [emailChips, setEmailChips] = React.useState<string[]>([])
  const [emailInput, setEmailInput] = React.useState('')
  const [selectedRole, setSelectedRole] = React.useState<MembershipRole>('member')
  const [sendingInvites, setSendingInvites] = React.useState(false)
  
  // Remove member confirmation dialog state
  const [memberToRemove, setMemberToRemove] = React.useState<{ id: string; name: string } | null>(null)
  const [removingMember, setRemovingMember] = React.useState(false)

  const fetchTeamData = React.useCallback(async () => {
    setLoading(true)
    const result = await getTeamData()
    setData(result)
    setLoading(false)
  }, [])

  React.useEffect(() => {
    fetchTeamData()
  }, [fetchTeamData])

  // Check for welcome-invite-team flag from sessionStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const shouldInvite = sessionStorage.getItem('welcome-invite-team')
      if (shouldInvite === 'true') {
        // Clear the flag
        sessionStorage.removeItem('welcome-invite-team')
        // Focus the email input if it exists
        // The input will be focused when the component renders
        setTimeout(() => {
          const emailInput = document.querySelector('input[type="email"], input[placeholder*="email" i]') as HTMLInputElement
          if (emailInput) {
            emailInput.focus()
          }
        }, 100)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!data || 'error' in data) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-destructive">
            {data?.message || 'Failed to load team data'}
          </p>
        </div>
      </div>
    )
  }

  const { members, pendingInvites, currentUserRole, currentUserId, inviteLink } = data
  const inviteLinkToken = inviteLink?.token ?? null
  const isOwner = currentUserRole === 'owner'

  // Combine members and pending invites into unified list
  type UnifiedMember = 
    | { type: 'member'; data: TeamMember }
    | { type: 'pending'; data: PendingInvite }

  const unifiedList: UnifiedMember[] = [
    ...members.map((member) => ({ type: 'member' as const, data: member })),
    ...pendingInvites.map((invite) => ({ type: 'pending' as const, data: invite })),
  ]

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return '?'
  }

  // Get initials from email for pending invites
  const getEmailInitials = (email: string) => {
    const parts = email.split('@')[0]
    if (parts.length >= 2) {
      return parts.substring(0, 2).toUpperCase()
    }
    return email[0].toUpperCase()
  }

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  // Handle adding email chip
  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && emailInput.trim()) {
      e.preventDefault()
      const trimmedEmail = emailInput.trim().toLowerCase()
      
      // Validate email
      if (!isValidEmail(trimmedEmail)) {
        toast.error('Please enter a valid email address')
        return
      }

      // Check for duplicates
      if (emailChips.includes(trimmedEmail)) {
        toast.error('This email is already in the list')
        return
      }

      // Add email to chips
      setEmailChips([...emailChips, trimmedEmail])
      setEmailInput('')
    }
  }

  // Handle removing email chip
  const handleRemoveEmail = (emailToRemove: string) => {
    setEmailChips(emailChips.filter((email) => email !== emailToRemove))
  }

  // Handle sending invites
  const handleSendInvites = async () => {
    if (emailChips.length === 0) {
      toast.error('Please add at least one email address')
      return
    }

    setSendingInvites(true)

    try {
      // Get current studio ID
      const studioIdResult = await getCurrentStudioId()
      
      if ('error' in studioIdResult) {
        toast.error(studioIdResult.message)
        setSendingInvites(false)
        return
      }

      const studioId = studioIdResult.studioId
      const errors: string[] = []
      let successCount = 0

      // Send invite for each email
      for (const email of emailChips) {
        const result = await createStudioInvite({
          email,
          role: selectedRole,
          studioId,
        })
        
        if ('error' in result) {
          errors.push(`${email}: ${result.message}`)
        } else {
          successCount++
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`Invites sent! ${successCount} invite${successCount > 1 ? 's' : ''} sent successfully.`)
      }

      if (errors.length > 0) {
        errors.forEach((error) => {
          toast.error(error)
        })
      }

      // Clear form and refresh data on success
      if (errors.length === 0) {
        setEmailChips([])
        setEmailInput('')
        setSelectedRole('member')
        await fetchTeamData()
      }
    } catch (error) {
      toast.error('Failed to send invites. Please try again.')
    } finally {
      setSendingInvites(false)
    }
  }

  // Handle revoking invite
  const handleRevokeInvite = async (inviteId: string) => {
    const result = await revokeStudioInvite(inviteId)
    
    if ('error' in result) {
      toast.error(result.message)
    } else {
      toast.success('Invite revoked')
      await fetchTeamData()
    }
  }

  // Handle removing member
  const handleRemoveMember = async () => {
    if (!memberToRemove) return
    
    setRemovingMember(true)
    const result = await removeStudioMember(memberToRemove.id)
    
    if ('error' in result) {
      toast.error(result.message)
    } else {
      toast.success('Member removed')
      await fetchTeamData()
    }
    
    setRemovingMember(false)
    setMemberToRemove(null)
  }
  
  // Handle opening remove confirmation dialog
  const handleOpenRemoveDialog = (memberId: string, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName })
  }

  // Handle copying invite link
  const handleCopyInviteLink = async (token?: string | null) => {
    if (!token) {
      toast.error('Invite link is not available. Reset the link and try again.')
      return
    }
    const inviteLink = `${window.location.origin}/join?token=${token}`
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast.success('Invite link copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy invite link')
    }
  }

  // Placeholder handlers
  const handleResendInvite = () => {
    toast.info('Resend invite feature coming soon')
  }

  const handleChangeRole = () => {
    toast.info('Change role feature coming soon')
  }

  const handleTransferOwnership = () => {
    toast.info('Transfer ownership feature coming soon')
  }

  return (
    <div>
      {/* Members Section */}
      <section>
        <h3 className="text-xl font-semibold mb-4">Members</h3>
        {unifiedList.length === 0 ? (
          <p className="text-muted-foreground">No members found</p>
        ) : (
          <div className="border rounded-lg divide-y">
            {unifiedList.map((item) => {
              if (item.type === 'member') {
                const member = item.data
                const isCurrentUser = member.user.id === currentUserId
                const showMenu = isOwner && !isCurrentUser

                return (
                  <div key={member.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={member.user.avatar_url || undefined}
                          alt={member.user.full_name || member.user.email || undefined}
                        />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {getInitials(member.user.full_name, member.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.user.full_name || member.user.email || 'Unknown'}
                        </p>
                        {member.user.full_name && member.user.email && (
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded capitalize">
                        {member.role}
                      </span>
                      {showMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-60 hover:opacity-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuItem onClick={handleChangeRole}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenRemoveDialog(member.id, member.user.full_name || member.user.email || 'Unknown')}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleTransferOwnership}>
                              <Crown className="h-4 w-4 mr-2" />
                              Transfer Ownership
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )
              } else {
                const invite = item.data
                const expiresAt = new Date(invite.expires_at)
                const daysUntilExpiry = Math.ceil(
                  (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
                const showMenu = isOwner

                return (
                  <div key={invite.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {getEmailInitials(invite.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                      {showMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-60 hover:opacity-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuItem
                              onClick={() => handleRevokeInvite(invite.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Revoke Invite
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleResendInvite}>
                              <Mail className="h-4 w-4 mr-2" />
                              Resend Invite
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!inviteLinkToken}
                              onClick={() => handleCopyInviteLink(inviteLinkToken)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Invite Link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )
              }
            })}
          </div>
        )}
      </section>
      
      {/* Remove Member Confirmation Dialog */}
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from this studio? 
              This action cannot be undone and they will lose access to all studio resources.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMemberToRemove(null)}
              disabled={removingMember}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={removingMember}
            >
              {removingMember ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}