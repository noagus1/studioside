'use server'

/**
 * Get Team Data Server Action
 * 
 * Fetches team members and pending invites for the current studio.
 * Used by client components that need team data.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import { admin } from '@/lib/supabase/adminClient'

export interface TeamMember {
  id: string
  role: string
  status: string
  joined_at: string
  created_at: string
  last_sign_in_at: string | null
  user: {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

export interface PendingInvite {
  id: string
  email: string
  role: string
  status: string
  expires_at: string
  created_at: string
}

export interface TeamData {
  members: TeamMember[]
  pendingInvites: PendingInvite[]
  currentUserRole: string | null
  currentUserId: string | null
  inviteLink?: InviteLinkData | null
}

export interface InviteLinkData {
  token: string | null
  is_enabled: boolean
  created_at: string
}

export interface TeamDataError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

export async function getTeamData(): Promise<TeamData | TeamDataError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view team data',
    }
  }

  // Get current studio
  const studioId = await getCurrentStudioId()

  if (!studioId) {
    return {
      error: 'NO_STUDIO',
      message: 'No studio selected',
    }
  }

  // Set studio context for RLS
  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
  } catch (error) {
    console.warn('Failed to set current_studio_id:', error)
  }

  // Verify user is a member of this studio before fetching all members
  const { data: userMembership } = await supabase
    .from('studio_users')
    .select('id, role, status')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!userMembership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  // Parallelize fetching memberships and invites since they don't depend on each other
  const [membershipsResult, invitesResult] = await Promise.all([
    // Step 1: Fetch memberships (without profile relationship)
    // Use admin client to bypass RLS so we can see all members in the studio
    // This is safe because we've already verified the user is a member above
    admin
      .from('studio_users')
      .select('id, role, status, joined_at, created_at, user_id')
      .eq('studio_id', studioId)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    // Fetch pending invites (admins/owners only)
    userMembership.role === 'owner' || userMembership.role === 'admin'
      ? admin
          .from('studio_invitations')
          .select('*')
          .eq('studio_id', studioId)
          .eq('status', 'pending')
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null })
  ])

  const { data: memberships, error: membershipsError } = membershipsResult
  const { data: invites, error: invitesError } = invitesResult

  if (membershipsError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch members: ${membershipsError.message}`,
    }
  }

  if (invitesError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch invites: ${invitesError.message}`,
    }
  }

  // Step 2: Extract user IDs from memberships
  const userIds = (memberships || []).map((m) => m.user_id).filter(Boolean)

  // Step 3: Fetch profiles separately if we have user IDs
  let profiles: Array<{
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
  }> = []
  let lastActiveMap: Record<string, string | null> = {}

  if (userIds.length > 0) {
    // Use admin client to fetch profiles since we're querying by user IDs
    // This is safe because we've already verified the user is a member of the studio
    const { data: profilesData, error: profilesError } = await admin
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      return {
        error: 'DATABASE_ERROR',
        message: `Failed to fetch profiles: ${profilesError.message}`,
      }
    }

    profiles = profilesData || []

    // Fetch last sign-in timestamps from auth users to power the "Last active" column
    const lastActiveResults = await Promise.all(
      userIds.map(async (userId) => {
        const { data, error } = await admin.auth.admin.getUserById(userId)
        if (error) {
          console.warn('Failed to fetch last_sign_in_at for user', userId, error)
          return null
        }
        return {
          userId,
          last_sign_in_at: data?.user?.last_sign_in_at ?? null,
        }
      })
    )

    lastActiveMap = Object.fromEntries(
      lastActiveResults
        .filter((result): result is { userId: string; last_sign_in_at: string | null } => !!result)
        .map((result) => [result.userId, result.last_sign_in_at])
    )
  }

  // Step 4: Combine memberships with profiles
  const members: TeamMember[] = (memberships || []).map((membership) => {
    const profile = profiles.find((p) => p.id === membership.user_id)
    return {
      id: membership.id,
      role: membership.role,
      status: membership.status,
      joined_at: membership.joined_at || membership.created_at,
      created_at: membership.created_at,
      last_sign_in_at: lastActiveMap[membership.user_id] ?? null,
      user: profile || {
        id: membership.user_id,
        email: null,
        full_name: null,
        avatar_url: null,
      },
    }
  })

  // Get current user's membership to determine role
  // Use the membership we already fetched for verification
  const currentUserRole = userMembership?.role || null
  const inviteLink: InviteLinkData | null =
    currentUserRole === 'owner' || currentUserRole === 'admin'
      ? await (async () => {
          const { data, error } = await admin
            .from('studio_invite_links')
            .select('token, is_enabled, created_at')
            .eq('studio_id', studioId)
            .maybeSingle()
          if (error) {
            console.warn('Failed to fetch invite link', error)
            return null
          }
          if (!data) return null
          return {
            token: data.token ?? null,
            is_enabled: data.is_enabled,
            created_at: data.created_at,
          }
        })()
      : null

  const pendingInvites: PendingInvite[] = (invites || []).map((invite: any) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expires_at: invite.expires_at,
    created_at: invite.created_at,
  }))

  return {
    members,
    pendingInvites,
    currentUserRole,
    currentUserId: user.id,
    inviteLink,
  }
}

