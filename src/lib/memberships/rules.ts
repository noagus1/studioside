import type { InvitationStatus, MembershipRole } from '@/types/db'

type InviteCheckInput = {
  status: InvitationStatus
  expiresAt: string
  acceptedAt: string | null
}

export function isInviteAcceptable({ status, expiresAt, acceptedAt }: InviteCheckInput): boolean {
  if (status !== 'pending') return false
  if (acceptedAt) return false
  const expiry = new Date(expiresAt)
  if (Number.isNaN(expiry.getTime())) return false
  return expiry.getTime() > Date.now()
}

type RoleChangeInput = {
  actorRole: MembershipRole | null
  targetRole: MembershipRole
  targetIsSelf: boolean
  nextRole: MembershipRole
}

export function canChangeMemberRole({ actorRole, targetRole, targetIsSelf, nextRole }: RoleChangeInput): {
  allowed: boolean
  reason?: string
} {
  if (!actorRole || (actorRole !== 'owner' && actorRole !== 'admin')) {
    return { allowed: false, reason: 'actor-not-privileged' }
  }

  if (targetRole === 'owner') {
    return { allowed: false, reason: 'target-owner' }
  }

  if (targetIsSelf && actorRole !== 'owner') {
    return { allowed: false, reason: 'self-change-not-allowed' }
  }

  if (actorRole === 'admin' && nextRole === 'owner') {
    return { allowed: false, reason: 'admin-cannot-promote-owner' }
  }

  return { allowed: true }
}
