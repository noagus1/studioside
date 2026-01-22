'use server'

/**
 * Client Server Actions
 *
 * Server actions for managing clients in the current studio.
 * All operations are scoped to the current studio via current_studio_id().
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import type { Session } from '@/types/session'

// Client interface
export interface Client {
  id: string
  studio_id: string
  name: string
  created_at: string
  updated_at: string
}

// CreateClient
export interface CreateClientInput {
  name: string
}

export interface CreateClientResult {
  success: true
  client: Client
}

export interface CreateClientError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'INSUFFICIENT_PERMISSIONS' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

// GetClients
export interface GetClientsResult {
  success: true
  clients: Client[]
}

export interface GetClientsError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

// GetClientById
export interface GetClientResult {
  success: true
  client: Client
}

export interface GetClientError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'NOT_FOUND' | 'DATABASE_ERROR'
  message: string
}

// UpdateClient
export interface UpdateClientInput {
  name?: string
  // Future: Add CRM fields here when database schema is extended
  // email?: string | null
  // phone?: string | null
  // notes?: string | null
}

export interface UpdateClientResult {
  success: true
  client: Client
}

export interface UpdateClientError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'INSUFFICIENT_PERMISSIONS' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

// DeleteClient
export interface DeleteClientResult {
  success: true
}

export interface DeleteClientError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'INSUFFICIENT_PERMISSIONS' | 'NOT_FOUND' | 'DATABASE_ERROR'
  message: string
}

// GetSessionsForClient
export interface GetSessionsForClientResult {
  success: true
  sessions: Session[]
}

export interface GetSessionsForClientError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

/**
 * Creates a new client in the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be an admin or owner
 * 
 * @param input - Client creation data (name required)
 * @returns Created client or error object
 */
export async function createClient(
  input: CreateClientInput
): Promise<CreateClientResult | CreateClientError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to create a client',
    }
  }

  // Validate input
  if (!input.name || !input.name.trim()) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Client name is required',
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
      message: 'Only admins and owners can create clients',
    }
  }

  // Insert client
  // RLS will ensure we can only insert clients for the current studio
  const { data: client, error: insertError } = await supabase
    .from('clients')
    .insert({
      studio_id: studioId,
      name: input.name.trim(),
    })
    .select('*')
    .single()

  if (insertError) {
    // If error is RLS violation, user doesn't have permission
    if (insertError.message.includes('row-level security')) {
      return {
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to create clients in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to create client: ${insertError.message}`,
    }
  }

  return {
    success: true,
    client: client as Client,
  }
}

/**
 * Fetches all clients for the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * 
 * @returns Array of clients ordered by created_at descending, or error object
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
  // Ordered by created_at descending (newest first)
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })

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

/**
 * Fetches a single client by ID for the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - Client must belong to the current studio
 * 
 * @param clientId - The ID of the client to fetch
 * @returns Client or error object
 */
export async function getClientById(
  clientId: string
): Promise<GetClientResult | GetClientError> {
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

  // Fetch client by ID, ensuring it belongs to the current studio
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('studio_id', studioId)
    .single()

  if (clientError) {
    if (clientError.code === 'PGRST116') {
      // No rows returned
      return {
        error: 'NOT_FOUND',
        message: 'Client not found or does not belong to this studio',
      }
    }
    if (clientError.message.includes('row-level security')) {
      return {
        error: 'NOT_A_MEMBER',
        message: 'You do not have permission to view this client',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch client: ${clientError.message}`,
    }
  }

  if (!client) {
    return {
      error: 'NOT_FOUND',
      message: 'Client not found',
    }
  }

  return {
    success: true,
    client: client as Client,
  }
}

/**
 * Fetches all sessions for a specific client in the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - Client must belong to the current studio
 * 
 * @param clientId - The ID of the client
 * @returns Array of sessions ordered by start_time descending, or error object
 */
export async function getSessionsForClient(
  clientId: string
): Promise<GetSessionsForClientResult | GetSessionsForClientError> {
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

  // Verify client exists and belongs to current studio
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('studio_id', studioId)
    .single()

  if (!client) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'Client not found or does not belong to this studio',
    }
  }

  // Fetch sessions for this client
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select(`
      *,
      room:rooms(id, name),
      client:clients(id, name),
      engineer:profiles!sessions_engineer_id_fkey(id, full_name, email)
    `)
    .eq('studio_id', studioId)
    .eq('client_id', clientId)
    .order('start_time', { ascending: false })

  if (sessionsError) {
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
 * Updates a client in the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be an admin or owner
 * - Client must belong to the current studio
 * 
 * @param clientId - The ID of the client to update
 * @param input - Client update data (name optional, future: CRM fields)
 * @returns Updated client or error object
 */
export async function updateClient(
  clientId: string,
  input: UpdateClientInput
): Promise<UpdateClientResult | UpdateClientError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to update a client',
    }
  }

  // Validate input - at least one field must be provided
  if (input.name !== undefined && !input.name?.trim()) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Client name cannot be empty',
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
      message: 'Only admins and owners can update clients',
    }
  }

  // Verify client exists and belongs to current studio
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('studio_id', studioId)
    .single()

  if (!existingClient) {
    return {
      error: 'NOT_FOUND',
      message: 'Client not found or does not belong to this studio',
    }
  }

  // Build update data (only include fields that are provided)
  const updateData: { name?: string } = {}
  if (input.name !== undefined) {
    updateData.name = input.name.trim()
  }

  // If no fields to update, return current client
  if (Object.keys(updateData).length === 0) {
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (!client) {
      return {
        error: 'NOT_FOUND',
        message: 'Client not found',
      }
    }

    return {
      success: true,
      client: client as Client,
    }
  }

  // Update client
  // RLS will ensure we can only update clients for the current studio
  const { data: client, error: updateError } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', clientId)
    .eq('studio_id', studioId)
    .select('*')
    .single()

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return {
        error: 'NOT_FOUND',
        message: 'Client not found or does not belong to this studio',
      }
    }
    if (updateError.message.includes('row-level security')) {
      return {
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to update clients in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to update client: ${updateError.message}`,
    }
  }

  return {
    success: true,
    client: client as Client,
  }
}

/**
 * Deletes a client from the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be an admin or owner
 * - Client must belong to the current studio
 * 
 * @param clientId - The ID of the client to delete
 * @returns Success or error object
 */
export async function deleteClient(
  clientId: string
): Promise<DeleteClientResult | DeleteClientError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to delete a client',
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
      message: 'Only admins and owners can delete clients',
    }
  }

  // Verify client exists and belongs to current studio
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('studio_id', studioId)
    .single()

  if (!existingClient) {
    return {
      error: 'NOT_FOUND',
      message: 'Client not found or does not belong to this studio',
    }
  }

  // Delete client
  // RLS will ensure we can only delete clients for the current studio
  const { error: deleteError } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('studio_id', studioId)

  if (deleteError) {
    if (deleteError.code === 'PGRST116') {
      return {
        error: 'NOT_FOUND',
        message: 'Client not found or does not belong to this studio',
      }
    }
    if (deleteError.message.includes('row-level security')) {
      return {
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to delete clients in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to delete client: ${deleteError.message}`,
    }
  }

  return {
    success: true,
  }
}
