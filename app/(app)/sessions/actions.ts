'use server'

/**
 * Sessions Server Actions
 * 
 * Server actions for managing sessions in the current studio.
 * All operations are scoped to the current studio via current_studio_id().
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import type { SessionStatus } from '@/types/db'
import type { Session, SessionGearItem } from '@/types/session'

const BACKEND_FALLBACK_SESSION_LENGTH_HOURS = 2

// Client interface
export interface Client {
  id: string
  studio_id: string
  name: string
  created_at: string
  updated_at: string
}

// Re-export Session for convenience
export type { Session }

// GetClients
export interface GetClientsResult {
  success: true
  clients: Client[]
}

export interface GetClientsError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

// GetSessions
export interface GetSessionsResult {
  success: true
  sessions: Session[]
}

export interface GetSessionsError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

// GetSessionById
export interface GetSessionByIdResult {
  success: true
  session: Session
}

export interface GetSessionByIdError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'NOT_FOUND' | 'DATABASE_ERROR'
  message: string
}

// Session gear assignments
export interface SessionGearInput {
  gear_id: string
}

export interface SessionGearResult {
  success: true
  gear: SessionGearItem[]
  /**
   * Back-compat alias; resources will be identical to gear.
   * Kept until all callers are migrated to gear/session_gear.
   */
  resources?: SessionGearItem[]
  warnings?: SessionResourceWarning[]
}

export interface SessionGearError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'VALIDATION_ERROR'
    | 'NOT_FOUND'
    | 'DATABASE_ERROR'
  message: string
}

// Legacy resource helpers retained for tests and UI compatibility
export interface SessionResourceInput {
  gear_id?: string | null
  quantity?: number | null
  note?: string | null
}

export interface SessionResourceWarning {
  gear_id: string
  requested: number
  available: number
  message: string
}

type NormalizedResource = { gear_id: string; quantity: number; note: string | null }

function normalizeResourceInputs(inputs: SessionResourceInput[] | null | undefined): NormalizedResource[] {
  if (!Array.isArray(inputs)) return []
  return inputs
    .map((res) => {
      const gearId = res?.gear_id?.trim()
      if (!gearId) return null
      const quantity =
        typeof res?.quantity === 'number' && res.quantity > 0 ? Math.max(1, Math.round(res.quantity)) : 1
      const note = res?.note?.trim() || null
      return { gear_id: gearId, quantity, note }
    })
    .filter(Boolean) as NormalizedResource[]
}

function computeAvailabilityWarnings(
  resources: SessionResourceInput[] | null | undefined,
  gearLookup: Record<string, { quantity?: number | null }>
): SessionResourceWarning[] {
  const totals = new Map<string, number>()
  normalizeResourceInputs(resources).forEach((res) => {
    totals.set(res.gear_id, (totals.get(res.gear_id) || 0) + res.quantity)
  })

  const warnings: SessionResourceWarning[] = []
  for (const [gearId, requested] of totals.entries()) {
    const available = gearLookup[gearId]?.quantity ?? 0
    if (available > 0 && requested > available) {
      warnings.push({
        gear_id: gearId,
        requested,
        available,
        message: `Requested ${requested} but only ${available} available for gear ${gearId}`,
      })
    }
  }
  return warnings
}

// CreateSession
export interface CreateSessionInput {
  date: string // YYYY-MM-DD format
  start_time: string // HH:MM format
  end_time?: string // HH:MM format, optional (derived from defaults if missing)
  room_id: string
  client_id: string
  engineer_id?: string | null
  notes?: string | null
}

export interface CreateSessionResult {
  success: true
  session: Session
}

export interface CreateSessionError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'INSUFFICIENT_PERMISSIONS' | 'VALIDATION_ERROR' | 'ROOM_CONFLICT' | 'ENGINEER_CONFLICT' | 'DATABASE_ERROR'
  message: string
  conflictDetails?: {
    conflicting_session_id: string
    conflicting_client_name: string | null
    conflicting_start_time: string
    conflicting_end_time: string
  }
}

export interface SessionDefaultsResult {
  success: true
  default_session_length_hours: number | null
  default_buffer_minutes: number | null
}

export interface SessionDefaultsError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

/**
 * Fetches all clients for the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * 
 * @returns Array of clients ordered by name ascending, or error object
 */
export async function getClients(): Promise<GetClientsResult | GetClientsError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view clients',
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
    .from('studio_users')
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

  // Fetch clients for the current studio
  // RLS will ensure we only see clients for the current studio
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('studio_id', studioId)
    .order('name', { ascending: true })

  if (clientsError) {
    // If error is RLS violation, user doesn't have permission
    if (clientsError.message.includes('row-level security')) {
      return {
        error: 'NOT_A_MEMBER',
        message: 'You do not have permission to view clients in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch clients: ${clientsError.message}`,
    }
  }

  return {
    success: true,
    clients: (clients || []) as Client[],
  }
}

async function getSessionDefaultsForStudio(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  studioId: string
) {
  const { data, error } = await supabase
    .from('studio_defaults')
    .select('default_session_length_hours, default_buffer_minutes')
    .eq('studio_id', studioId)
    .maybeSingle()

  if (error) {
    return {
      default_session_length_hours: null,
      default_buffer_minutes: null,
      error,
    }
  }

  if (!data) {
    return {
      default_session_length_hours: BACKEND_FALLBACK_SESSION_LENGTH_HOURS,
      default_buffer_minutes: 0,
      error: null,
    }
  }

  return {
    default_session_length_hours: data.default_session_length_hours ?? BACKEND_FALLBACK_SESSION_LENGTH_HOURS,
    default_buffer_minutes: data.default_buffer_minutes ?? 0,
    error: null,
  }
}

async function ensureStudioDefaultsRow(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  studioId: string
) {
  const { data } = await supabase
    .from('studio_defaults')
    .select('studio_id')
    .eq('studio_id', studioId)
    .maybeSingle()

  if (data) return

  await supabase
    .from('studio_defaults')
    .insert({
      studio_id: studioId,
      default_session_length_hours: BACKEND_FALLBACK_SESSION_LENGTH_HOURS,
      default_buffer_minutes: 0,
    })
    .maybeSingle()
}

export async function getSessionDefaults(): Promise<SessionDefaultsResult | SessionDefaultsError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view session defaults',
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
    .from('studio_users')
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

  await ensureStudioDefaultsRow(supabase, studioId)

  const defaults = await getSessionDefaultsForStudio(supabase, studioId)

  if (defaults.error) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch session defaults: ${defaults.error.message}`,
    }
  }

  return {
    success: true,
    default_session_length_hours: defaults.default_session_length_hours,
    default_buffer_minutes: defaults.default_buffer_minutes,
  }
}

/**
 * Fetches sessions for the current studio, optionally filtered by date range.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * 
 * @param startDate - Optional start date (YYYY-MM-DD) for filtering sessions
 * @param endDate - Optional end date (YYYY-MM-DD) for filtering sessions
 * @returns Array of sessions with relations, or error object
 */
export async function getSessions(
  startDate?: string,
  endDate?: string
): Promise<GetSessionsResult | GetSessionsError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view sessions',
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

  // Validate date formats if provided
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid start date format. Expected YYYY-MM-DD',
    }
  }

  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid end date format. Expected YYYY-MM-DD',
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
    .from('studio_users')
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

  // Build query
  let query = supabase
    .from('sessions')
    .select(`
      *,
      room:rooms(id, name),
      client:clients(id, name),
      engineer:profiles!sessions_engineer_id_fkey(id, full_name, email),
      session_gear:session_gear(
        id,
        gear_id,
        gear:gear(
          id,
          brand,
          model,
          quantity,
          type:gear_types(id, name)
        )
      )
    `)
    .eq('studio_id', studioId)
    .order('start_time', { ascending: true })

  // Apply date filters if provided
  if (startDate) {
    query = query.gte('start_time', `${startDate}T00:00:00Z`)
  }
  if (endDate) {
    // Include all sessions that start before or on the end date
    query = query.lte('start_time', `${endDate}T23:59:59Z`)
  }

  const { data: sessions, error: sessionsError } = await query

  if (sessionsError) {
    // If error is RLS violation, user doesn't have permission
    if (sessionsError.message.includes('row-level security')) {
      return {
        error: 'NOT_A_MEMBER',
        message: 'You do not have permission to view sessions in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch sessions: ${sessionsError.message}`,
    }
  }

  // Transform the data to match our Session interface
  const transformedSessions: Session[] = (sessions || []).map((session: any) => ({
    id: session.id,
    studio_id: session.studio_id,
    room_id: session.room_id,
    client_id: session.client_id,
    engineer_id: session.engineer_id,
    start_time: session.start_time,
    end_time: session.end_time,
    notes: session.notes ?? null,
    gear_items: mapSessionGearRows(session.session_gear as SessionGearRow[] | null),
    status: session.status,
    created_at: session.created_at,
    updated_at: session.updated_at,
    room: session.room ? { id: session.room.id, name: session.room.name } : null,
    client: session.client ? { id: session.client.id, name: session.client.name } : null,
    engineer: session.engineer
      ? {
          id: session.engineer.id,
          full_name: session.engineer.full_name,
          email: session.engineer.email,
        }
      : null,
  }))

  return {
    success: true,
    sessions: transformedSessions,
  }
}

/**
 * Fetch a single session by id for the current studio.
 */
export async function getSessionById(
  sessionId: string
): Promise<GetSessionByIdResult | GetSessionByIdError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view sessions',
    }
  }

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

  // Verify membership
  const { data: userMembership } = await supabase
    .from('studio_users')
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

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      *,
      room:rooms(id, name),
      client:clients(id, name),
      engineer:profiles!sessions_engineer_id_fkey(id, full_name, email),
      session_gear:session_gear(
        id,
        gear_id,
        gear:gear(
          id,
          brand,
          model,
          quantity,
          type:gear_types(id, name)
        )
      )
    `)
    .eq('id', sessionId)
    .eq('studio_id', studioId)
    .maybeSingle()

  if (sessionError) {
    if (sessionError.message.includes('row-level security')) {
      return {
        error: 'NOT_A_MEMBER',
        message: 'You do not have permission to view sessions in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch session: ${sessionError.message}`,
    }
  }

  if (!session) {
    return {
      error: 'NOT_FOUND',
      message: 'Session not found',
    }
  }

  const transformed: Session = {
    id: session.id,
    studio_id: session.studio_id,
    room_id: session.room_id,
    client_id: session.client_id,
    engineer_id: session.engineer_id,
    start_time: session.start_time,
    end_time: session.end_time,
    notes: session.notes ?? null,
    gear_items: mapSessionGearRows(session.session_gear as SessionGearRow[] | null),
    resources: mapSessionGearRows(session.session_gear as SessionGearRow[] | null),
    status: session.status,
    created_at: session.created_at,
    updated_at: session.updated_at,
    room: session.room ? { id: session.room.id, name: session.room.name } : null,
    client: session.client ? { id: session.client.id, name: session.client.name } : null,
    engineer: session.engineer
      ? {
          id: session.engineer.id,
          full_name: session.engineer.full_name,
          email: session.engineer.email,
        }
      : null,
  }

  return { success: true, session: transformed }
}

type SessionGearRow = {
  id: string
  gear_id: string
  gear?: {
    id: string
    brand: string | null
    model: string | null
    quantity: number | null
    category: string | null
    type?: { id: string; name: string; icon_key: string } | null
  } | null
}

function normalizeSessionGearRows(data: any[] | null): SessionGearRow[] {
  if (!Array.isArray(data)) return []

  return data.map((row) => {
    const gear = Array.isArray(row.gear) ? row.gear[0] : row.gear
    const gearType = gear && Array.isArray(gear.type) ? gear.type[0] : gear?.type

    return {
      ...row,
      gear: gear
        ? {
            ...gear,
            type: gearType
              ? { ...gearType, icon_key: gearType.icon_key ?? gearType.name ?? 'music' }
              : null,
          }
        : null,
    }
  })
}

function mapSessionGearRows(rows: SessionGearRow[] | null): SessionGearItem[] {
  return (rows || []).map((row) => ({
    id: row.id,
    gear_id: row.gear_id,
    quantity: 1,
    note: null,
    gear: row.gear
      ? {
          ...row.gear,
          type: row.gear.type
            ? {
                ...row.gear.type,
                icon_key: row.gear.type.icon_key || row.gear.type.name || 'music',
              }
            : null,
        }
      : null,
  }))
}

async function fetchSessionGearContext(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  sessionId: string,
  { requireAdmin }: { requireAdmin: boolean }
): Promise<{ studioId: string } | SessionGearError> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to manage session gear',
    }
  }

  const studioId = await getCurrentStudioId()

  if (!studioId) {
    return {
      error: 'NO_STUDIO',
      message: 'No studio selected',
    }
  }

  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
  } catch (error) {
    console.warn('Failed to set current_studio_id:', error)
  }

  const { data: membership } = await supabase
    .from('studio_users')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  if (requireAdmin && membership.role !== 'owner' && membership.role !== 'admin') {
    return {
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'Only admins and owners can manage session gear',
    }
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, studio_id')
    .eq('id', sessionId)
    .eq('studio_id', studioId)
    .maybeSingle()

  if (sessionError || !session) {
    return {
      error: 'NOT_FOUND',
      message: 'Session not found',
    }
  }

  return { studioId }
}

async function fetchSessionGearAssignments(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  sessionId: string
): Promise<SessionGearItem[]> {
  const { data, error } = await supabase
    .from('session_gear')
    .select(
      `
        id,
        gear_id,
        gear:gear(
          id,
          brand,
          model,
          quantity,
          type:gear_types(id, name)
        )
      `
    )
    .eq('session_id', sessionId)

  if (error) {
    throw new Error(error.message)
  }

  const rows = normalizeSessionGearRows(data)
  return mapSessionGearRows(rows)
}

export async function getSessionResources(sessionId: string): Promise<SessionGearResult | SessionGearError> {
  const supabase = await getSupabaseClient()
  const context = await fetchSessionGearContext(supabase, sessionId, { requireAdmin: false })
  if ('error' in context) return context

  try {
    const gear = await fetchSessionGearAssignments(supabase, sessionId)
    return { success: true, gear, resources: gear }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch session gear'
    return {
      error: 'DATABASE_ERROR',
      message,
    }
  }
}

export async function addSessionResource(
  sessionId: string,
  input: SessionGearInput
): Promise<SessionGearResult | SessionGearError> {
  const supabase = await getSupabaseClient()
  const context = await fetchSessionGearContext(supabase, sessionId, { requireAdmin: true })
  if ('error' in context) return context

  if (!input?.gear_id || !input.gear_id.trim()) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Gear ID is required',
    }
  }

  const { error: upsertError } = await supabase
    .from('session_gear')
    .upsert(
      {
        session_id: sessionId,
        gear_id: input.gear_id.trim(),
      },
      { onConflict: 'session_id,gear_id' }
    )

  if (upsertError) {
    if (upsertError.message.includes('row-level security')) {
      return {
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to update this session gear',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to add gear: ${upsertError.message}`,
    }
  }

  return getSessionResources(sessionId)
}

export async function updateSessionResourceItem(
  sessionId: string,
  input: SessionGearInput
): Promise<SessionGearResult | SessionGearError> {
  // session_gear has no additional editable fields today; treat as idempotent add
  return addSessionResource(sessionId, input)
}

export async function removeSessionResource(
  sessionId: string,
  gearId: string
): Promise<SessionGearResult | SessionGearError> {
  const supabase = await getSupabaseClient()
  const context = await fetchSessionGearContext(supabase, sessionId, { requireAdmin: true })
  if ('error' in context) return context

  const { error: deleteError } = await supabase
    .from('session_gear')
    .delete()
    .eq('session_id', sessionId)
    .eq('gear_id', gearId)

  if (deleteError) {
    if (deleteError.message.includes('row-level security')) {
      return {
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to update this session gear',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to remove gear: ${deleteError.message}`,
    }
  }

  return getSessionResources(sessionId)
}

/**
 * Creates a new session in the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be an admin or owner
 * - All required fields must be valid
 * - No room conflicts for the specified time
 * - No engineer conflicts for the specified time (if engineer provided)
 * 
 * @param input - Session creation data (date, start_time, end_time, room_id, client_id, engineer_id)
 * @returns Created session with relations, or error object
 */
export async function createSession(
  input: CreateSessionInput
): Promise<CreateSessionResult | CreateSessionError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to create a session',
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

  // Verify user is a member of this studio and is an admin
  const { data: membership } = await supabase
    .from('studio_users')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return {
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'Only admins and owners can create sessions',
    }
  }

  // Validate input
  // Date format: YYYY-MM-DD
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid date format. Expected YYYY-MM-DD',
    }
  }

  // Time format: HH:MM
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  if (!input.start_time || !timeRegex.test(input.start_time)) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid start time format. Expected HH:MM (24-hour format)',
    }
  }

  if (input.end_time && !timeRegex.test(input.end_time)) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid end time format. Expected HH:MM (24-hour format)',
    }
  }

  // Validate required fields
  if (!input.room_id || !input.room_id.trim()) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Room is required',
    }
  }

  if (!input.client_id || !input.client_id.trim()) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Client is required',
    }
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000

  const startDate = new Date(`${input.date}T${input.start_time}`)

  if (Number.isNaN(startDate.getTime())) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid date or time values',
    }
  }

  let derivedEndDate: Date

  if (input.end_time) {
    const endDateSameDay = new Date(`${input.date}T${input.end_time}`)
    if (Number.isNaN(endDateSameDay.getTime())) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Invalid date or time values',
      }
    }
    // If the end time is earlier than the start time, treat it as next-day.
    derivedEndDate =
      endDateSameDay > startDate
        ? endDateSameDay
        : new Date(endDateSameDay.getTime() + ONE_DAY_MS)
  } else {
    await ensureStudioDefaultsRow(supabase, studioId)
    const defaults = await getSessionDefaultsForStudio(supabase, studioId)
    const sessionLengthHours =
      defaults.default_session_length_hours && defaults.default_session_length_hours > 0
        ? defaults.default_session_length_hours
        : BACKEND_FALLBACK_SESSION_LENGTH_HOURS

    derivedEndDate = new Date(startDate.getTime() + sessionLengthHours * 60 * 60 * 1000)
  }

  const startTime = startDate.toISOString()
  const endTime = derivedEndDate.toISOString()

  // Debug instrumentation removed

  // Validate room exists and belongs to current studio
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id')
    .eq('id', input.room_id)
    .eq('studio_id', studioId)
    .single()

  if (roomError || !room) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Room not found or does not belong to this studio',
    }
  }

  // Validate client exists and belongs to current studio
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', input.client_id)
    .eq('studio_id', studioId)
    .single()

  if (clientError || !client) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Client not found or does not belong to this studio',
    }
  }

  // Validate engineer if provided
  if (input.engineer_id) {
    // Check that engineer is a member of the current studio
    const { data: engineerMembership } = await supabase
      .from('studio_users')
      .select('user_id')
      .eq('studio_id', studioId)
      .eq('user_id', input.engineer_id)
      .maybeSingle()

    if (!engineerMembership) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Engineer must be a member of this studio',
      }
    }
  }

  // Check for room conflicts
  // A conflict occurs when:
  // - Same room_id
  // - Time ranges overlap (start_time < existing_end_time AND end_time > existing_start_time)
  // - Status is not 'cancelled'
  const { data: roomConflicts, error: roomConflictError } = await supabase
    .from('sessions')
    .select('id, start_time, end_time, client:clients(name)')
    .eq('room_id', input.room_id)
    .eq('studio_id', studioId)
    .neq('status', 'cancelled')
    .lt('start_time', endTime) // start_time < new_end_time
    .gt('end_time', startTime) // end_time > new_start_time

  if (roomConflictError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to check for room conflicts: ${roomConflictError.message}`,
    }
  }

  // Debug instrumentation removed

  if (roomConflicts && roomConflicts.length > 0) {
    const conflict = roomConflicts[0]
    return {
      error: 'ROOM_CONFLICT',
      message: `Room is already booked for this time`,
      conflictDetails: {
        conflicting_session_id: conflict.id,
        conflicting_client_name: (conflict.client as any)?.name || null,
        conflicting_start_time: conflict.start_time,
        conflicting_end_time: conflict.end_time,
      },
    }
  }

  // Check for engineer conflicts (if engineer provided)
  if (input.engineer_id) {
    const { data: engineerConflicts, error: engineerConflictError } = await supabase
      .from('sessions')
      .select('id, start_time, end_time, client:clients(name)')
      .eq('engineer_id', input.engineer_id)
      .eq('studio_id', studioId)
      .neq('status', 'cancelled')
      .lt('start_time', endTime) // start_time < new_end_time
      .gt('end_time', startTime) // end_time > new_start_time

    if (engineerConflictError) {
      return {
        error: 'DATABASE_ERROR',
        message: `Failed to check for engineer conflicts: ${engineerConflictError.message}`,
      }
    }

    if (engineerConflicts && engineerConflicts.length > 0) {
      const conflict = engineerConflicts[0]
      return {
        error: 'ENGINEER_CONFLICT',
        message: `Engineer is already assigned to a session during this time`,
        conflictDetails: {
          conflicting_session_id: conflict.id,
          conflicting_client_name: (conflict.client as any)?.name || null,
          conflicting_start_time: conflict.start_time,
          conflicting_end_time: conflict.end_time,
        },
      }
    }
  }

  const notes = input.notes?.trim() ? input.notes.trim() : null

  // Insert session
  const { data: session, error: insertError } = await supabase
    .from('sessions')
    .insert({
      studio_id: studioId,
      room_id: input.room_id,
      client_id: input.client_id,
      engineer_id: input.engineer_id || null,
      start_time: startTime,
      end_time: endTime,
      notes,
      status: 'scheduled' as SessionStatus,
    })
    .select()
    .single()

  if (insertError) {
    // If error is RLS violation, user doesn't have permission
    if (insertError.message.includes('row-level security')) {
      return {
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to create sessions in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to create session: ${insertError.message}`,
    }
  }

  // Fetch relations for the created session
  const { data: sessionWithRelations, error: relationsError } = await supabase
    .from('sessions')
    .select(`
      *,
      room:rooms(id, name),
      client:clients(id, name),
      engineer:profiles!sessions_engineer_id_fkey(id, full_name, email),
      session_gear:session_gear(
        id,
        gear_id,
        gear:gear(
          id,
          brand,
          model,
          quantity,
          category,
          type:gear_types(id, name, icon_key)
        )
      )
    `)
    .eq('id', session.id)
    .single()

  if (relationsError || !sessionWithRelations) {
    // If we can't fetch relations, return the session without them
    return {
      success: true,
      session: {
        ...session,
        room: null,
        client: null,
        engineer: null,
        notes: (session as any).notes ?? null,
      } as Session,
    }
  }

  // Transform to match Session interface
  const transformedSession: Session = {
    id: sessionWithRelations.id,
    studio_id: sessionWithRelations.studio_id,
    room_id: sessionWithRelations.room_id,
    client_id: sessionWithRelations.client_id,
    engineer_id: sessionWithRelations.engineer_id,
    start_time: sessionWithRelations.start_time,
    end_time: sessionWithRelations.end_time,
    notes: sessionWithRelations.notes ?? null,
    status: sessionWithRelations.status,
    created_at: sessionWithRelations.created_at,
    updated_at: sessionWithRelations.updated_at,
    gear_items: mapSessionGearRows((sessionWithRelations as any).session_gear as SessionGearRow[] | null),
    resources: mapSessionGearRows((sessionWithRelations as any).session_gear as SessionGearRow[] | null),
    room: (sessionWithRelations as any).room
      ? { id: (sessionWithRelations as any).room.id, name: (sessionWithRelations as any).room.name }
      : null,
    client: (sessionWithRelations as any).client
      ? {
          id: (sessionWithRelations as any).client.id,
          name: (sessionWithRelations as any).client.name,
        }
      : null,
    engineer: (sessionWithRelations as any).engineer
      ? {
          id: (sessionWithRelations as any).engineer.id,
          full_name: (sessionWithRelations as any).engineer.full_name,
          email: (sessionWithRelations as any).engineer.email,
        }
      : null,
  }

  return {
    success: true,
    session: transformedSession,
  }
}

// Expose helpers for testing
export const __test__normalizeResourceInputs = normalizeResourceInputs
export const __test__computeAvailabilityWarnings = computeAvailabilityWarnings

// DeleteSession
export interface DeleteSessionResult {
  success: true
}

export interface DeleteSessionError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'NOT_FOUND'
    | 'DATABASE_ERROR'
  message: string
}

/**
 * Deletes a session in the current studio.
 */
export async function deleteSession(
  sessionId: string
): Promise<DeleteSessionResult | DeleteSessionError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to delete a session',
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

  // Verify user is a member of this studio and is an admin
  const { data: membership } = await supabase
    .from('studio_users')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return {
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'Only admins and owners can delete sessions',
    }
  }

  // Verify session exists and belongs to current studio
  const { data: existingSession, error: sessionError } = await supabase
    .from('sessions')
    .select('id, studio_id')
    .eq('id', sessionId)
    .single()

  if (sessionError || !existingSession || existingSession.studio_id !== studioId) {
    return {
      error: 'NOT_FOUND',
      message: 'Session not found',
    }
  }

  const { error: deleteError } = await supabase.from('sessions').delete().eq('id', sessionId)

  if (deleteError) {
    if (deleteError.message.includes('row-level security')) {
      return {
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to delete sessions in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to delete session: ${deleteError.message}`,
    }
  }

  return { success: true }
}

// UpdateSessionStatus
export interface UpdateSessionStatusResult {
  success: true
  status: SessionStatus
}

export interface UpdateSessionStatusError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'DATABASE_ERROR'
  message: string
}

const ALLOWED_STATUS_UPDATES: SessionStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled']

/**
 * Updates only the status field for a session in the current studio.
 * Keeps the validations lightweight compared to full updateSession.
 */
export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<UpdateSessionStatusResult | UpdateSessionStatusError> {
  const normalizedStatus = status === 'finished' ? ('completed' as SessionStatus) : status

  if (!ALLOWED_STATUS_UPDATES.includes(normalizedStatus)) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Unsupported status transition',
    }
  }

  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to update the session status',
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

  // Verify user is a member of this studio and is an admin
  const { data: membership } = await supabase
    .from('studio_users')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return {
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'Only admins and owners can update session status',
    }
  }

  // Verify session exists and belongs to current studio
  const { data: existingSession, error: sessionError } = await supabase
    .from('sessions')
    .select('id, studio_id')
    .eq('id', sessionId)
    .single()

  if (sessionError || !existingSession || existingSession.studio_id !== studioId) {
    return {
      error: 'NOT_FOUND',
      message: 'Session not found',
    }
  }

  const { data: updatedSession, error: updateError } = await supabase
    .from('sessions')
    .update({ status: normalizedStatus })
    .eq('id', sessionId)
    .eq('studio_id', studioId)
    .select('status')
    .single()

  if (updateError) {
    if (updateError.message.includes('row-level security')) {
      return {
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to update sessions in this studio',
      }
    }

    return {
      error: 'DATABASE_ERROR',
      message: `Failed to update session status: ${updateError.message}`,
    }
  }

  return {
    success: true,
    status: updatedSession.status as SessionStatus,
  }
}

// UpdateSession
export interface UpdateSessionInput {
  start_at: string // ISO string
  end_at: string // ISO string
  room_id: string
  client_id: string
  engineer_id?: string | null
  status?: SessionStatus
  notes?: string | null
}

export interface UpdateSessionResult {
  success: true
  session: Session
}

export interface UpdateSessionError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'INSUFFICIENT_PERMISSIONS' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'ROOM_CONFLICT' | 'ENGINEER_CONFLICT' | 'DATABASE_ERROR'
  message: string
  conflictDetails?: {
    conflicting_session_id: string
    conflicting_client_name: string | null
    conflicting_start_time: string
    conflicting_end_time: string
  }
}

/**
 * Updates an existing session in the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be an admin or owner
 * - Session must exist and belong to the current studio
 * - All required fields must be valid
 * - No room conflicts for the specified time (excluding the current session)
 * - No engineer conflicts for the specified time (if engineer provided, excluding the current session)
 * 
 * @param sessionId - ID of the session to update
 * @param input - Session update data (date, start_time, end_time, room_id, client_id, engineer_id, status)
 * @returns Updated session with relations, or error object
 */
export async function updateSession(
  sessionId: string,
  input: UpdateSessionInput
): Promise<UpdateSessionResult | UpdateSessionError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to update a session',
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

  // Verify user is a member of this studio and is an admin
  const { data: membership } = await supabase
    .from('studio_users')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return {
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'Only admins and owners can update sessions',
    }
  }

  // Verify session exists and belongs to current studio
  const { data: existingSession, error: sessionError } = await supabase
    .from('sessions')
    .select('id, studio_id')
    .eq('id', sessionId)
    .single()

  if (sessionError || !existingSession) {
    return {
      error: 'NOT_FOUND',
      message: 'Session not found',
    }
  }

  if (existingSession.studio_id !== studioId) {
    return {
      error: 'NOT_FOUND',
      message: 'Session not found',
    }
  }

  // Validate input (full datetimes)
  const startDateObj = new Date(input.start_at)
  const endDateObj = new Date(input.end_at)

  if (!input.start_at || isNaN(startDateObj.getTime())) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid start datetime',
    }
  }

  if (!input.end_at || isNaN(endDateObj.getTime())) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid end datetime',
    }
  }

  if (startDateObj.getTime() >= endDateObj.getTime()) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'End time must be after start time',
    }
  }

  // Validate required fields
  if (!input.room_id || !input.room_id.trim()) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Room is required',
    }
  }

  if (!input.client_id || !input.client_id.trim()) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Client is required',
    }
  }

  const startTime = startDateObj.toISOString()
  const endTime = endDateObj.toISOString()

  // Validate room exists and belongs to current studio
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id')
    .eq('id', input.room_id)
    .eq('studio_id', studioId)
    .single()

  if (roomError || !room) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Room not found or does not belong to this studio',
    }
  }

  // Validate client exists and belongs to current studio
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', input.client_id)
    .eq('studio_id', studioId)
    .single()

  if (clientError || !client) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Client not found or does not belong to this studio',
    }
  }

  // Validate engineer if provided
  if (input.engineer_id) {
    // Check that engineer is a member of the current studio
    const { data: engineerMembership } = await supabase
      .from('studio_users')
      .select('user_id')
      .eq('studio_id', studioId)
      .eq('user_id', input.engineer_id)
      .maybeSingle()

    if (!engineerMembership) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Engineer must be a member of this studio',
      }
    }
  }

  // Check for room conflicts (excluding the current session)
  // A conflict occurs when:
  // - Same room_id
  // - Different session_id (not the one we're updating)
  // - Time ranges overlap (start_time < existing_end_time AND end_time > existing_start_time)
  // - Status is not 'cancelled'
  const { data: roomConflicts, error: roomConflictError } = await supabase
    .from('sessions')
    .select('id, start_time, end_time, client:clients(name)')
    .eq('room_id', input.room_id)
    .eq('studio_id', studioId)
    .neq('id', sessionId)
    .neq('status', 'cancelled')
    .lt('start_time', endTime) // start_time < new_end_time
    .gt('end_time', startTime) // end_time > new_start_time

  if (roomConflictError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to check for room conflicts: ${roomConflictError.message}`,
    }
  }

  if (roomConflicts && roomConflicts.length > 0) {
    const conflict = roomConflicts[0]
    return {
      error: 'ROOM_CONFLICT',
      message: `Room is already booked for this time`,
      conflictDetails: {
        conflicting_session_id: conflict.id,
        conflicting_client_name: (conflict.client as any)?.name || null,
        conflicting_start_time: conflict.start_time,
        conflicting_end_time: conflict.end_time,
      },
    }
  }

  // Check for engineer conflicts (if engineer provided, excluding the current session)
  if (input.engineer_id) {
    const { data: engineerConflicts, error: engineerConflictError } = await supabase
      .from('sessions')
      .select('id, start_time, end_time, client:clients(name)')
      .eq('engineer_id', input.engineer_id)
      .eq('studio_id', studioId)
      .neq('id', sessionId)
      .neq('status', 'cancelled')
      .lt('start_time', endTime) // start_time < new_end_time
      .gt('end_time', startTime) // end_time > new_start_time

    if (engineerConflictError) {
      return {
        error: 'DATABASE_ERROR',
        message: `Failed to check for engineer conflicts: ${engineerConflictError.message}`,
      }
    }

    if (engineerConflicts && engineerConflicts.length > 0) {
      const conflict = engineerConflicts[0]
      return {
        error: 'ENGINEER_CONFLICT',
        message: `Engineer is already assigned to a session during this time`,
        conflictDetails: {
          conflicting_session_id: conflict.id,
          conflicting_client_name: (conflict.client as any)?.name || null,
          conflicting_start_time: conflict.start_time,
          conflicting_end_time: conflict.end_time,
        },
      }
    }
  }

  // Build update object
  const updateData: any = {
    room_id: input.room_id,
    client_id: input.client_id,
    engineer_id: input.engineer_id || null,
    start_time: startTime,
    end_time: endTime,
  }

  if (input.notes !== undefined) {
    updateData.notes = input.notes?.trim() ? input.notes.trim() : null
  }

  // Only update status if provided
  if (input.status !== undefined) {
    updateData.status = input.status
  }

  // Update session
  const { data: session, error: updateError } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single()

  if (updateError) {
    // If error is RLS violation, user doesn't have permission
    if (updateError.message.includes('row-level security')) {
      return {
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to update sessions in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to update session: ${updateError.message}`,
    }
  }

  // Fetch relations for the updated session
  const { data: sessionWithRelations, error: relationsError } = await supabase
    .from('sessions')
    .select(`
      *,
      room:rooms(id, name),
      client:clients(id, name),
      engineer:profiles!sessions_engineer_id_fkey(id, full_name, email)
    `)
    .eq('id', session.id)
    .single()

  if (relationsError || !sessionWithRelations) {
    // If we can't fetch relations, return the session without them
    return {
      success: true,
      session: {
        ...session,
        room: null,
        client: null,
        engineer: null,
        notes: (session as any).notes ?? null,
      } as Session,
    }
  }

  // Transform to match Session interface
  const transformedSession: Session = {
    id: sessionWithRelations.id,
    studio_id: sessionWithRelations.studio_id,
    room_id: sessionWithRelations.room_id,
    client_id: sessionWithRelations.client_id,
    engineer_id: sessionWithRelations.engineer_id,
    start_time: sessionWithRelations.start_time,
    end_time: sessionWithRelations.end_time,
    notes: sessionWithRelations.notes ?? null,
    status: sessionWithRelations.status,
    created_at: sessionWithRelations.created_at,
    updated_at: sessionWithRelations.updated_at,
    room: (sessionWithRelations as any).room
      ? { id: (sessionWithRelations as any).room.id, name: (sessionWithRelations as any).room.name }
      : null,
    client: (sessionWithRelations as any).client
      ? {
          id: (sessionWithRelations as any).client.id,
          name: (sessionWithRelations as any).client.name,
        }
      : null,
    engineer: (sessionWithRelations as any).engineer
      ? {
          id: (sessionWithRelations as any).engineer.id,
          full_name: (sessionWithRelations as any).engineer.full_name,
          email: (sessionWithRelations as any).engineer.email,
        }
      : null,
  }

  return {
    success: true,
    session: transformedSession,
  }
}
