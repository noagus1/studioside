'use server'

/**
 * Rooms Server Actions
 * 
 * Server actions for managing rooms in the current studio.
 * All operations are scoped to the current studio via current_studio_id().
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'

export type BillingStyle = 'hourly' | 'flat_session'

export interface Room {
  id: string
  studio_id: string
  name: string
  description: string | null
  is_active: boolean
  use_studio_pricing: boolean
  billing_style: BillingStyle | null
  rate: number | null
  overtime_rate: number | null
  created_at: string
  updated_at: string
}

export interface GetRoomsResult {
  success: true
  rooms: Room[]
}

export interface GetRoomsError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

export interface CreateRoomInput {
  name: string
  description?: string | null
}

export interface CreateRoomResult {
  success: true
  room: Room
}

export interface CreateRoomError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'INSUFFICIENT_PERMISSIONS' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

export interface UpdateRoomInput {
  name?: string
  description?: string | null
  is_active?: boolean
  use_studio_pricing?: boolean
  billing_style?: BillingStyle | null
  rate?: number | null
  overtime_rate?: number | null
}

export interface UpdateRoomResult {
  success: true
  room: Room
}

export interface UpdateRoomError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'INSUFFICIENT_PERMISSIONS' | 'ROOM_NOT_FOUND' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

export interface DeleteRoomResult {
  success: true
}

export interface DeleteRoomError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'INSUFFICIENT_PERMISSIONS' | 'ROOM_NOT_FOUND' | 'DATABASE_ERROR'
  message: string
}

/**
 * Fetches all rooms for the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * 
 * @returns Array of rooms ordered by created_at ascending, or error object
 */
export async function getRooms(): Promise<GetRoomsResult | GetRoomsError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view rooms',
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
  // Note: getSupabaseClient() already sets this, but we ensure it's set
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

  // Fetch rooms for the current studio
  // RLS will ensure we only see rooms for the current studio
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: true })

  if (roomsError) {
    // If error is RLS violation, user doesn't have permission
    if (roomsError.message.includes('row-level security')) {
      return {
        error: 'NOT_A_MEMBER',
        message: 'You do not have permission to view rooms in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch rooms: ${roomsError.message}`,
    }
  }

  return {
    success: true,
    rooms: (rooms || []) as Room[],
  }
}

/**
 * Creates a new room in the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be an admin or owner
 * 
 * @param input - Room creation data (name required, description optional)
 * @returns Created room or error object
 */
export async function createRoom(
  input: CreateRoomInput
): Promise<CreateRoomResult | CreateRoomError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to create a room',
    }
  }

  // Validate input
  if (!input.name || !input.name.trim()) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Room name is required',
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
      message: 'Only admins and owners can create rooms',
    }
  }

  // Insert room
  // RLS will ensure we can only insert rooms for the current studio
  const { data: room, error: insertError } = await supabase
    .from('rooms')
    .insert({
      studio_id: studioId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .select()
    .single()

  if (insertError) {
    // If error is RLS violation, user doesn't have permission
    if (insertError.message.includes('row-level security')) {
      return {
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to create rooms in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to create room: ${insertError.message}`,
    }
  }

  return {
    success: true,
    room: room as Room,
  }
}

/**
 * Updates a room in the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be an admin or owner
 * - Room must belong to the current studio
 * 
 * @param roomId - The ID of the room to update
 * @param input - Room update data (name and/or description)
 * @returns Updated room or error object
 */
export async function updateRoom(
  roomId: string,
  input: UpdateRoomInput
): Promise<UpdateRoomResult | UpdateRoomError> {
  const supabase = await getSupabaseClient()

  // Validate roomId
  if (!roomId) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Room ID is required',
    }
  }

  // Validate that at least one field is being updated
  if (
    input.name === undefined &&
    input.description === undefined &&
    input.is_active === undefined &&
    input.use_studio_pricing === undefined &&
    input.billing_style === undefined &&
    input.rate === undefined &&
    input.overtime_rate === undefined
  ) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'At least one field must be provided',
    }
  }

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to update a room',
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
      message: 'Only admins and owners can update rooms',
    }
  }

  // Validate pricing fields
  if (input.use_studio_pricing === false) {
    // If using custom pricing, billing_style and rate are required
    if (input.billing_style === undefined && input.rate === undefined) {
      // Check if we're updating to custom pricing - need to validate
      // This will be handled in the update logic below
    }
  }

  // Build update object
  const updateData: {
    name?: string
    description?: string | null
    is_active?: boolean
    use_studio_pricing?: boolean
    billing_style?: BillingStyle | null
    rate?: number | null
    overtime_rate?: number | null
  } = {}
  
  if (input.name !== undefined) {
    if (!input.name.trim()) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Room name cannot be empty',
      }
    }
    updateData.name = input.name.trim()
  }
  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null
  }
  if (input.is_active !== undefined) {
    updateData.is_active = input.is_active
  }
  if (input.use_studio_pricing !== undefined) {
    updateData.use_studio_pricing = input.use_studio_pricing
    // If switching to studio pricing, clear custom pricing fields
    if (input.use_studio_pricing === true) {
      updateData.billing_style = null
      updateData.rate = null
      updateData.overtime_rate = null
    }
  }
  if (input.billing_style !== undefined) {
    updateData.billing_style = input.billing_style
  }
  if (input.rate !== undefined) {
    if (input.rate !== null && input.rate < 0) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Rate must be a positive number',
      }
    }
    updateData.rate = input.rate
  }
  if (input.overtime_rate !== undefined) {
    if (input.overtime_rate !== null && input.overtime_rate < 0) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Overtime rate must be a positive number',
      }
    }
    updateData.overtime_rate = input.overtime_rate
  }

  // Validate custom pricing requirements
  const willUseStudioPricing = updateData.use_studio_pricing ?? (input.use_studio_pricing === undefined ? undefined : input.use_studio_pricing)
  if (willUseStudioPricing === false) {
    // If using custom pricing, billing_style and rate must be set
    const finalBillingStyle = updateData.billing_style ?? input.billing_style
    const finalRate = updateData.rate ?? input.rate
    
    if (!finalBillingStyle || finalRate === null || finalRate === undefined) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Billing style and rate are required when using custom pricing',
      }
    }
  }

  // Update room
  // Must filter by both id and studio_id to prevent cross-studio access
  const { data: room, error: updateError } = await supabase
    .from('rooms')
    .update(updateData)
    .eq('id', roomId)
    .eq('studio_id', studioId)
    .select()
    .single()

  if (updateError) {
    // If error is "not found" (PGRST116), room doesn't exist or doesn't belong to studio
    if (updateError.code === 'PGRST116' || updateError.message.includes('row-level security')) {
      return {
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found or you do not have permission to update it',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to update room: ${updateError.message}`,
    }
  }

  if (!room) {
    return {
      error: 'ROOM_NOT_FOUND',
      message: 'Room not found',
    }
  }

  return {
    success: true,
    room: room as Room,
  }
}

/**
 * Deletes a room from the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be an admin or owner
 * - Room must belong to the current studio
 * 
 * @param roomId - The ID of the room to delete
 * @returns Success result or error object
 */
export async function deleteRoom(
  roomId: string
): Promise<DeleteRoomResult | DeleteRoomError> {
  const supabase = await getSupabaseClient()

  // Validate roomId
  if (!roomId) {
    return {
      error: 'DATABASE_ERROR',
      message: 'Room ID is required',
    }
  }

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to delete a room',
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
      message: 'Only admins and owners can delete rooms',
    }
  }

  // Delete room
  // Must filter by both id and studio_id to prevent cross-studio access
  const { error: deleteError } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId)
    .eq('studio_id', studioId)

  if (deleteError) {
    // If error is RLS violation, room doesn't exist or user doesn't have permission
    if (deleteError.message.includes('row-level security')) {
      return {
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found or you do not have permission to delete it',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to delete room: ${deleteError.message}`,
    }
  }

  return {
    success: true,
  }
}

