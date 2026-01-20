'use server'

/**
 * Dashboard Server Actions
 * 
 * Server actions for fetching dashboard data including activity feed and studio overview stats.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import { getRooms } from '../settings/rooms/actions'
import { getClients } from '../sessions/actions'
import { getGear } from '../gear/actions'
import { getSessions } from '../sessions/actions'
import type { Session } from '@/types/session'

export interface ActivityItem {
  id: string
  type: 'session_created' | 'session_completed' | 'client_created' | 'gear_created' | 'gear_updated' | 'member_joined' | 'studio_settings_updated'
  description: string
  timestamp: string
  metadata?: {
    session_id?: string
    client_id?: string
    gear_id?: string
    member_id?: string
    studio_id?: string
  }
}

export interface GetActivityResult {
  success: true
  activities: ActivityItem[]
}

export interface GetActivityError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

export interface StudioOverviewStats {
  roomsCount: number
  clientsCount: number
  gearCount: number
  sessionsThisMonth: number
}

export interface GetStudioOverviewResult {
  success: true
  stats: StudioOverviewStats
}

export interface GetStudioOverviewError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

export interface GetTodaySessionsResult {
  success: true
  sessions: Session[]
}

export interface GetTodaySessionsError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

export interface GetUpcomingSessionsResult {
  success: true
  sessions: Session[]
}

export interface GetUpcomingSessionsError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

/**
 * Fetches sessions for today only (start_time between today 00:00:00 and today 23:59:59).
 * Filters to scheduled/in_progress status.
 */
export async function getTodaySessions(): Promise<GetTodaySessionsResult | GetTodaySessionsError> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const result = await getSessions(todayStr, todayStr)

  if ('error' in result) {
    // Map GetSessionsError to GetTodaySessionsError
    // VALIDATION_ERROR shouldn't occur since we construct the date ourselves,
    // but we map it to DATABASE_ERROR for type safety
    if (result.error === 'VALIDATION_ERROR') {
      return {
        error: 'DATABASE_ERROR',
        message: result.message,
      }
    }
    return {
      error: result.error,
      message: result.message,
    }
  }

  // Filter to only scheduled/in_progress sessions
  const filteredSessions = result.sessions.filter(
    (s) => s.status === 'scheduled' || s.status === 'in_progress'
  )

  return {
    success: true,
    sessions: filteredSessions,
  }
}

/**
 * Fetches upcoming sessions starting from tomorrow (excludes today).
 * Filters to scheduled/in_progress status and limits results.
 */
export async function getUpcomingSessions(options?: {
  limit?: number
}): Promise<GetUpcomingSessionsResult | GetUpcomingSessionsError> {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const result = await getSessions(tomorrowStr)

  if ('error' in result) {
    // Map GetSessionsError to GetUpcomingSessionsError
    // VALIDATION_ERROR shouldn't occur since we construct the date ourselves,
    // but we map it to DATABASE_ERROR for type safety
    if (result.error === 'VALIDATION_ERROR') {
      return {
        error: 'DATABASE_ERROR',
        message: result.message,
      }
    }
    return {
      error: result.error,
      message: result.message,
    }
  }

  // Filter to only scheduled/in_progress sessions
  const filteredSessions = result.sessions
    .filter((s) => s.status === 'scheduled' || s.status === 'in_progress')
    .slice(0, options?.limit || 3)

  return {
    success: true,
    sessions: filteredSessions,
  }
}

/**
 * Fetches recent activity for the current studio.
 * Combines activities from sessions, clients, gear, and members.
 */
export async function getRecentActivity(): Promise<GetActivityResult | GetActivityError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view activity',
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

  // Verify user is a member of this studio
  const { data: userMembership } = await supabase
    .from('studio_memberships')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!userMembership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  const activities: ActivityItem[] = []

  // Fetch recent sessions (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sessionsResult = await getSessions(thirtyDaysAgo.toISOString().split('T')[0])

  if ('success' in sessionsResult && sessionsResult.success) {
    sessionsResult.sessions.forEach((session) => {
      // Session created
      activities.push({
        id: `session_created_${session.id}`,
        type: 'session_created',
        description: session.client
          ? `Session scheduled with ${session.client.name}`
          : 'Session scheduled',
        timestamp: session.created_at,
        metadata: { session_id: session.id },
      })

      // Session completed (if status is completed)
      if (session.status === 'completed') {
        activities.push({
          id: `session_completed_${session.id}`,
          type: 'session_completed',
          description: session.client
            ? `Session completed with ${session.client.name}`
            : 'Session completed',
          timestamp: session.updated_at,
          metadata: { session_id: session.id },
        })
      }
    })
  }

  // Fetch recent clients (last 30 days)
  const clientsResult = await getClients()
  if ('success' in clientsResult && clientsResult.success) {
    const thirtyDaysAgoTime = thirtyDaysAgo.getTime()
    clientsResult.clients.forEach((client) => {
      const clientCreated = new Date(client.created_at).getTime()
      if (clientCreated >= thirtyDaysAgoTime) {
        activities.push({
          id: `client_created_${client.id}`,
          type: 'client_created',
          description: `Client ${client.name} added`,
          timestamp: client.created_at,
          metadata: { client_id: client.id },
        })
      }
    })
  }

  // Fetch recent gear (last 30 days)
  const gearResult = await getGear()
  if ('success' in gearResult && gearResult.success) {
    const thirtyDaysAgoTime = thirtyDaysAgo.getTime()
    gearResult.gear.forEach((gear) => {
      const gearCreated = new Date(gear.created_at).getTime()
      const gearUpdated = new Date(gear.updated_at).getTime()

      if (gearCreated >= thirtyDaysAgoTime) {
        const gearName = gear.brand && gear.model
          ? `${gear.brand} ${gear.model}`
          : gear.type?.name || 'Gear'
        activities.push({
          id: `gear_created_${gear.id}`,
          type: 'gear_created',
          description: `${gearName} added`,
          timestamp: gear.created_at,
          metadata: { gear_id: gear.id },
        })
      } else if (gearUpdated >= thirtyDaysAgoTime && gearCreated < thirtyDaysAgoTime) {
        // Only show update if it wasn't just created
        const gearName = gear.brand && gear.model
          ? `${gear.brand} ${gear.model}`
          : gear.type?.name || 'Gear'
        activities.push({
          id: `gear_updated_${gear.id}_${gear.updated_at}`,
          type: 'gear_updated',
          description: `${gearName} updated`,
          timestamp: gear.updated_at,
          metadata: { gear_id: gear.id },
        })
      }
    })
  }

  // Fetch recent members (last 30 days)
  // Query memberships first, then fetch profiles separately to avoid RLS issues
  const { data: memberships } = await supabase
    .from('studio_memberships')
    .select('id, created_at, user_id')
    .eq('studio_id', studioId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  if (memberships && memberships.length > 0) {
    // Fetch profiles for these users
    const userIds = memberships.map((m: any) => m.user_id).filter(Boolean)
    let profiles: Array<{ id: string; full_name: string | null; email: string | null }> = []

    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      profiles = profilesData || []
    }

    // Create a map for quick lookup
    const profileMap = new Map(profiles.map((p) => [p.id, p]))

    memberships.forEach((membership: any) => {
      const profile = profileMap.get(membership.user_id)
      const memberName = profile?.full_name || profile?.email || 'Team member'
      activities.push({
        id: `member_joined_${membership.id}`,
        type: 'member_joined',
        description: `${memberName} joined the studio`,
        timestamp: membership.created_at,
        metadata: { member_id: membership.user_id },
      })
    })
  }

  // Fetch recent studio settings updates (last 30 days)
  const { data: studio } = await supabase
    .from('studios')
    .select('id, updated_at, last_updated_by')
    .eq('id', studioId)
    .maybeSingle()

  if (studio && studio.updated_at) {
    const studioUpdated = new Date(studio.updated_at).getTime()
    const thirtyDaysAgoTime = thirtyDaysAgo.getTime()

    if (studioUpdated >= thirtyDaysAgoTime && studio.last_updated_by) {
      // Fetch profile for the user who made the change
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', studio.last_updated_by)
        .maybeSingle()

      const userName = profile?.full_name || profile?.email || 'Someone'
      activities.push({
        id: `studio_settings_updated_${studio.id}_${studio.updated_at}`,
        type: 'studio_settings_updated',
        description: `${userName} updated studio settings`,
        timestamp: studio.updated_at,
        metadata: { studio_id: studio.id },
      })
    }
  }

  // Sort by timestamp descending and limit to 15
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const recentActivities = activities.slice(0, 15)

  return {
    success: true,
    activities: recentActivities,
  }
}

/**
 * Fetches studio overview statistics (counts for rooms, clients, gear, sessions).
 */
export async function getStudioOverview(): Promise<GetStudioOverviewResult | GetStudioOverviewError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view studio overview',
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

  // Verify user is a member of this studio
  const { data: userMembership } = await supabase
    .from('studio_memberships')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!userMembership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  // Fetch counts in parallel
  const [roomsResult, clientsResult, gearResult] = await Promise.all([
    getRooms(),
    getClients(),
    getGear(),
  ])

  // Get sessions for current month
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const sessionsResult = await getSessions(
    firstDayOfMonth.toISOString().split('T')[0],
    lastDayOfMonth.toISOString().split('T')[0]
  )

  const roomsCount = 'success' in roomsResult && roomsResult.success ? roomsResult.rooms.length : 0
  const clientsCount = 'success' in clientsResult && clientsResult.success ? clientsResult.clients.length : 0
  const gearCount = 'success' in gearResult && gearResult.success ? gearResult.gear.length : 0
  const sessionsThisMonth = 'success' in sessionsResult && sessionsResult.success ? sessionsResult.sessions.length : 0

  return {
    success: true,
    stats: {
      roomsCount,
      clientsCount,
      gearCount,
      sessionsThisMonth,
    },
  }
}
