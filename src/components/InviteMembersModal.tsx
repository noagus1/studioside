'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { createStudioInvite } from '@/actions/createStudioInvite'
import { getStudioSettings } from '@/actions/getStudioSettings'
import { getCurrentStudioId } from '@/actions/getCurrentStudioId'
import { resetInviteLink } from '@/actions/resetInviteLink'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { MembershipRole } from '@/types/db'
import { Link2 } from 'lucide-react'

interface InviteMembersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteMembersModal({ open, onOpenChange }: InviteMembersModalProps) {
  const [emailInput, setEmailInput] = React.useState('')
  const [emails, setEmails] = React.useState<string[]>([])
  const [selectedRole, setSelectedRole] = React.useState<MembershipRole>('member')
  const [sendingInvites, setSendingInvites] = React.useState(false)
  const [copyingLink, setCopyingLink] = React.useState(false)
  const [studioName, setStudioName] = React.useState('')

  React.useEffect(() => {
    if (!open) return

    let isMounted = true

    const loadStudioName = async () => {
      try {
        const result = await getStudioSettings()
        if (!('error' in result) && isMounted) {
          setStudioName(result.studio.name ?? '')
        }
      } catch (error) {
        // Silently fail; we'll fall back to the generic heading
        console.error('Failed to load studio name for invites', error)
      }
    }

    loadStudioName()

    return () => {
      isMounted = false
    }
  }, [open])

  React.useEffect(() => {
    if (!open) {
      setEmailInput('')
      setEmails([])
      setSelectedRole('member')
      setSendingInvites(false)
      setCopyingLink(false)
    }
  }, [open])

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  const parseEmailList = React.useCallback((value: string) => {
    return value
      .split(/[,\s]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  }, [])

  const pendingInputEmails = React.useMemo(() => parseEmailList(emailInput), [emailInput, parseEmailList])
  const pendingEmails = React.useMemo(
    () => Array.from(new Set([...emails, ...pendingInputEmails])),
    [emails, pendingInputEmails]
  )

  const commitInputToEmails = React.useCallback(() => {
    if (!emailInput.trim()) {
      return { success: true, emails }
    }

    const parsed = parseEmailList(emailInput)
    const invalid = parsed.filter((email) => !isValidEmail(email))
    if (invalid.length > 0) {
      toast.error(`Invalid email: ${invalid[0]}`)
      return { success: false, emails }
    }

    const merged = Array.from(new Set([...emails, ...parsed]))
    setEmails(merged)
    setEmailInput('')
    return { success: true, emails: merged }
  }, [emailInput, emails, parseEmailList])

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails((prev) => prev.filter((email) => email !== emailToRemove))
  }

  // Handle sending invites
  const handleSendInvites = async () => {
    const { success, emails: emailsToSend } = commitInputToEmails()
    if (!success) return

    if (emailsToSend.length === 0) {
      toast.error('Please enter at least one email address')
      return
    }

    const invalid = emailsToSend.filter((email) => !isValidEmail(email))
    if (invalid.length > 0) {
      toast.error(`Invalid email: ${invalid[0]}`)
      return
    }

    const uniqueEmails = Array.from(new Set(emailsToSend))
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
      for (const email of uniqueEmails) {
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
        toast.success(`Invites sent! ${successCount} invite${successCount > 1 ? 's' : ''} sent.`)
      }

      if (errors.length > 0) {
        errors.forEach((error) => {
          toast.error(error)
        })
      }

      // Close modal and clear form on success
      if (errors.length === 0) {
        onOpenChange(false)
      }
    } catch (error) {
      toast.error('Failed to send invites. Please try again.')
    } finally {
      setSendingInvites(false)
    }
  }

  const handleCopyInviteLink = async () => {
    setCopyingLink(true)
    try {
      const result = await resetInviteLink()
      if ('error' in result) {
        toast.error(result.message)
        setCopyingLink(false)
        return
      }
      const inviteLink = result.inviteUrl
      await navigator.clipboard.writeText(inviteLink)
      toast.success('Invite link copied')
    } catch (error) {
      toast.error('Failed to copy invite link')
    } finally {
      setCopyingLink(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-full max-w-md sm:max-w-lg flex-col gap-4 border border-border/70 bg-card p-5 shadow-xl sm:rounded-xl">
        <div className="space-y-1.5">
          <h2 className="text-lg font-normal leading-snug text-foreground">
            <span className="font-normal">Invite people to </span>
            <span className="font-medium">{studioName || 'your studio'}</span>
          </h2>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-foreground"></label>
          </div>
          <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <div className="flex min-h-[44px] flex-col items-start justify-center gap-1.5 rounded-md border border-input bg-background px-2 py-2 text-sm shadow-none focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-0">
                    {emails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-sm font-normal text-foreground"
                    >
                      <span className="truncate max-w-full text-foreground">{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-ring"
                        aria-label={`Remove ${email}`}
                        disabled={sendingInvites}
                      >
                        ×
                      </button>
                    </span>
                    ))}
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (emailInput.trim()) {
                        commitInputToEmails()
                      } else if (pendingEmails.length > 0 && !sendingInvites) {
                        handleSendInvites()
                      }
                    }
                    if (e.key === 'Backspace' && !emailInput && emails.length > 0) {
                      setEmails((prev) => prev.slice(0, -1))
                    }
                  }}
                  placeholder={emails.length ? '' : 'member@email.com'}
                  className={`w-full min-h-[24px] min-w-[140px] bg-transparent text-foreground border-0 outline-none focus-visible:outline-none focus-visible:ring-0 ${
                    emailInput ? 'placeholder:text-transparent' : 'placeholder:text-muted-foreground'
                  }`}
                  disabled={sendingInvites}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  aria-label="Add email"
                />
                  </div>
                  <div
                    className={`absolute right-1 flex items-center ${
                      emails.length > 0 ? 'top-1' : 'inset-y-1'
                    }`}
                  >
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as MembershipRole)}
                  disabled={sendingInvites}
                >
                  <SelectTrigger className="h-9 w-[170px] justify-between px-2.5 text-sm font-normal leading-none text-foreground border-0 bg-transparent hover:bg-muted/60 shadow-none focus:ring-0 focus:border-0">
                    <SelectValue className="text-sm font-normal leading-none" placeholder="Member" />
                  </SelectTrigger>
                  <SelectContent className="w-[180px] max-w-[calc(100vw-64px)] whitespace-nowrap">
                    <SelectItem value="admin" className="whitespace-nowrap">
                      <span className="text-sm font-normal text-foreground">Manager</span>
                    </SelectItem>
                    <SelectItem value="member" className="whitespace-nowrap">
                      <span className="text-sm font-normal text-foreground">Member</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            className="whitespace-nowrap justify-start sm:justify-start text-[hsl(var(--ring))] hover:text-[hsl(var(--ring))] focus-visible:text-[hsl(var(--ring))] active:text-[hsl(var(--ring))] hover:bg-primary/10 px-2.5"
            onClick={handleCopyInviteLink}
            disabled={copyingLink}
          >
            <Link2 className="h-4 w-4 text-[hsl(var(--ring))]" aria-hidden />
            {copyingLink ? 'Copying…' : 'Copy invite link'}
          </Button>
          <Button
            className="w-full text-sm font-medium shadow-sm sm:w-auto sm:px-4 sm:h-9 bg-[hsl(var(--ring))] text-white hover:bg-[hsl(var(--ring))]/90"
            onClick={handleSendInvites}
            disabled={pendingEmails.length === 0 || sendingInvites}
          >
            {sendingInvites ? 'Sending…' : 'Invite'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}