import { describe, expect, it } from 'vitest'
import { canChangeMemberRole, isInviteAcceptable } from '@/lib/memberships/rules'

describe('isInviteAcceptable', () => {
  const future = new Date(Date.now() + 60_000).toISOString()
  const past = new Date(Date.now() - 60_000).toISOString()

  it('accepts pending, unaccepted invites that are not expired', () => {
    expect(
      isInviteAcceptable({
        status: 'pending',
        expiresAt: future,
        acceptedAt: null,
      })
    ).toBe(true)
  })

  it('rejects expired invites', () => {
    expect(
      isInviteAcceptable({
        status: 'pending',
        expiresAt: past,
        acceptedAt: null,
      })
    ).toBe(false)
  })

  it('rejects accepted or revoked invites', () => {
    expect(
      isInviteAcceptable({
        status: 'accepted',
        expiresAt: future,
        acceptedAt: future,
      })
    ).toBe(false)
    expect(
      isInviteAcceptable({
        status: 'revoked',
        expiresAt: future,
        acceptedAt: null,
      })
    ).toBe(false)
  })
})

describe('canChangeMemberRole', () => {
  it('prevents non-admin actors from changing roles', () => {
    expect(
      canChangeMemberRole({
        actorRole: 'member',
        targetRole: 'member',
        targetIsSelf: false,
        nextRole: 'admin',
      }).allowed
    ).toBe(false)
  })

  it('blocks changing owner roles', () => {
    const result = canChangeMemberRole({
      actorRole: 'owner',
      targetRole: 'owner',
      targetIsSelf: false,
      nextRole: 'admin',
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('target-owner')
  })

  it('allows owners to change other members', () => {
    const result = canChangeMemberRole({
      actorRole: 'owner',
      targetRole: 'member',
      targetIsSelf: false,
      nextRole: 'admin',
    })
    expect(result.allowed).toBe(true)
  })

  it('prevents admins from promoting to owner', () => {
    const result = canChangeMemberRole({
      actorRole: 'admin',
      targetRole: 'member',
      targetIsSelf: false,
      nextRole: 'owner',
    })
    expect(result.allowed).toBe(false)
  })

  it('prevents admins from changing their own role', () => {
    const result = canChangeMemberRole({
      actorRole: 'admin',
      targetRole: 'admin',
      targetIsSelf: true,
      nextRole: 'member',
    })
    expect(result.allowed).toBe(false)
  })
})
