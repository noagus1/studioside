import { describe, expect, it, beforeEach, vi } from 'vitest'

const getInviteByToken = vi.fn()
const upsertSpy = vi.fn()
const membershipQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  upsert: upsertSpy,
}
const membershipUpsertChain = {
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null }),
}
upsertSpy.mockReturnValue(membershipUpsertChain as any)

const invitationUpdate = {
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnValue({ error: null }),
}
const linkQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: { is_enabled: true } }),
  update: vi.fn().mockReturnThis(),
}

const mockAdminFrom = vi.fn((table: string) => {
  if (table === 'studio_memberships') return membershipQuery as any
  if (table === 'studio_invitations') return invitationUpdate as any
  if (table === 'studio_invite_links') return linkQuery as any
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  }
})

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/supabase/serverClient', () => ({
  getSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
        error: null,
      }),
    },
    rpc: vi.fn(),
  })),
}))

vi.mock('@/lib/cookies/currentStudio', () => ({
  setCurrentStudioId: vi.fn(),
}))

vi.mock('@/lib/cookies/inviteToken', () => ({
  clearInviteToken: vi.fn(),
}))

vi.mock('@/actions/getInviteByToken', () => ({
  getInviteByToken,
}))

vi.mock('@/actions/getOnboardingRedirectPath', () => ({
  getOnboardingRedirectPath: vi.fn(async () => '/dashboard'),
}))

vi.mock('@/lib/supabase/adminClient', () => ({
  admin: {
    from: mockAdminFrom,
  },
}))

describe('acceptInvite', () => {
  beforeEach(() => {
    getInviteByToken.mockReset()
    upsertSpy.mockClear()
    membershipQuery.maybeSingle.mockResolvedValue({ data: null })
    linkQuery.maybeSingle.mockResolvedValue({ data: { is_enabled: true } })
  })

  it('rejects when invited email does not match user email', async () => {
    getInviteByToken.mockResolvedValue({
      source: 'invitation',
      role: 'member',
      email: 'other@example.com',
      studio: { id: 'studio-1', name: 'Test', slug: 'test', logo_url: null },
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      invitation: {
        id: 'invite-1',
        studio_id: 'studio-1',
        invited_by: 'owner-1',
        email: 'other@example.com',
        role: 'member',
        status: 'pending',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        accepted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        token_hash: 'hash',
      },
    })

    const { acceptInvite } = await import('@/actions/acceptInvite')

    await expect(acceptInvite('token-1')).rejects.toThrow('different email address')
    expect(upsertSpy).not.toHaveBeenCalled()
  })

  it('forces invite link acceptance to member role', async () => {
    getInviteByToken.mockResolvedValue({
      source: 'invite_link',
      role: 'admin', // should be clamped to member on acceptance
      studio: { id: 'studio-1', name: 'Test', slug: 'test', logo_url: null },
      expires_at: null,
    })
    const { acceptInvite } = await import('@/actions/acceptInvite')

    await expect(acceptInvite('link-token')).rejects.toThrow('REDIRECT:/dashboard')

    expect(upsertSpy).toHaveBeenCalled()
    const upsertArgs = upsertSpy.mock.calls[0][0]
    expect(upsertArgs.role).toBe('member')
  })
})
