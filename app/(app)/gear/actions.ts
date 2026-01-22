'use server'

/**
 * Gear Server Actions
 * 
 * Server actions for managing gear in the current studio.
 * All operations are scoped to the current studio via current_studio_id().
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import { applyFiltersToQuery } from './queryUtils'

export interface GearType {
  id: string
  name: string
  icon_key: string
}

export interface Gear {
  id: string
  studio_id: string
  type_id: string | null
  brand: string | null
  model: string | null
  quantity: number
  created_at: string
  updated_at: string
  // Optional relation for joined queries
  type?: GearType | null
}

export interface GearFilters {
  search?: string
  types?: string[] // gear type IDs
}

export interface GearFacetOptions {
  types: GearType[]
}

export interface GetGearResult {
  success: true
  gear: Gear[]
}

export interface GetGearError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'DATABASE_ERROR'
  message: string
}

export interface GetGearByIdResult {
  success: true
  gear: Gear
}

export interface GetGearByIdError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'DATABASE_ERROR'
    | 'GEAR_NOT_FOUND'
  message: string
}

export interface CreateGearInput {
  type_id?: string | null
  brand?: string | null
  model?: string | null
  quantity?: number | null
}

export interface CreateGearResult {
  success: true
  gear: Gear
}

export interface CreateGearError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'INSUFFICIENT_PERMISSIONS' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

export interface UpdateGearInput {
  type_id?: string | null
  brand?: string | null
  model?: string | null
  quantity?: number | null
}

export interface UpdateGearResult {
  success: true
  gear: Gear
}

export interface UpdateGearError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'INSUFFICIENT_PERMISSIONS' | 'GEAR_NOT_FOUND' | 'VALIDATION_ERROR' | 'DATABASE_ERROR'
  message: string
}

export interface DeleteGearResult {
  success: true
}

export interface DeleteGearError {
  error:
    | 'AUTHENTICATION_REQUIRED'
    | 'NO_STUDIO'
    | 'NOT_A_MEMBER'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'GEAR_NOT_FOUND'
    | 'DATABASE_ERROR'
  message: string
}

function buildGearSelectQuery(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  studioId: string,
  columns = 'id, studio_id, type_id, brand, model, quantity, created_at, updated_at, type:gear_types(id, name)'
) {
  return supabase
    .from('gear')
    .select(columns)
    .eq('studio_id', studioId)
}

function inferIconKey(typeName?: string, explicit?: string | null): string {
  if (explicit && explicit.trim()) return explicit
  const name = (typeName || '').toLowerCase()
  if (name.includes('mic')) return 'mic'
  if (name.includes('interface')) return 'interface'
  if (name.includes('guitar')) return 'guitar'
  if (name.includes('keyboard') || name.includes('synth') || name.includes('piano')) return 'keyboard-music'
  if (name.includes('headphone')) return 'headphones'
  if (name.includes('monitor') || name.includes('speaker')) return 'monitor'
  if (name.includes('amp')) return 'amp'
  if (name.includes('mixer')) return 'mixer'
  if (name.includes('outboard')) return 'outboard'
  return 'music'
}

function mapGearRows(gear: any[] | null): Gear[] {
  return (gear || []).map((g) => ({
    ...g,
    type: g.type
      ? {
          ...g.type,
          icon_key: inferIconKey(g.type.name, (g.type as any)?.icon_key),
        }
      : null,
  })) as Gear[]
}

async function ensureStudioContext(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  userId: string
): Promise<{ studioId: string } | GetGearError> {
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

  const { data: userMembership } = await supabase
    .from('studio_users')
    .select('id')
    .eq('studio_id', studioId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!userMembership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  return { studioId }
}

/**
 * Fetches all gear for the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * 
 * @returns Array of gear ordered by created_at ascending, or error object
 */
export async function getGear(): Promise<GetGearResult | GetGearError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view gear',
    }
  }

  // Get current studio
  const studioContext = await ensureStudioContext(supabase, user.id)
  if ('error' in studioContext) return studioContext
  const { studioId } = studioContext

  // Fetch gear for the current studio
  // RLS will ensure we only see gear for the current studio
  const { data: gear, error: gearError } = await buildGearSelectQuery(supabase, studioId).order('created_at', {
    ascending: true,
  })

  if (gearError) {
    // If error is RLS violation, user doesn't have permission
    if (gearError.message.includes('row-level security')) {
      return {
        error: 'NOT_A_MEMBER',
        message: 'You do not have permission to view gear in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch gear: ${gearError.message}`,
    }
  }

  return {
    success: true,
    gear: mapGearRows(gear),
  }
}

// applyFiltersToQuery moved to ./queryUtils to avoid awaiting thenable builders in this server action file

/**
 * Fetch gear using faceted filters + search (ANDed).
 */
export async function getGearWithFilters(
  filters: GearFilters = {}
): Promise<GetGearResult | GetGearError> {
  const supabase = await getSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view gear',
    }
  }

  const studioContext = await ensureStudioContext(supabase, user.id)
  if ('error' in studioContext) return studioContext
  const { studioId } = studioContext

  const baseQuery = buildGearSelectQuery(supabase, studioId)
  const filteredQuery = applyFiltersToQuery(baseQuery, filters)

  const { data: gear, error: gearError } = await filteredQuery.order('created_at', { ascending: true })

  if (gearError) {
    if (gearError.message.includes('row-level security')) {
      return {
        error: 'NOT_A_MEMBER',
        message: 'You do not have permission to view gear in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch gear: ${gearError.message}`,
    }
  }

  return {
    success: true,
    gear: mapGearRows(gear),
  }
}

/**
 * Fetch a single gear item by ID for the current studio.
 */
export async function getGearById(gearId: string): Promise<GetGearByIdResult | GetGearByIdError> {
  const supabase = await getSupabaseClient()

  if (!gearId) {
    return {
      error: 'GEAR_NOT_FOUND',
      message: 'Gear not found',
    }
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view gear',
    }
  }

  const studioContext = await ensureStudioContext(supabase, user.id)
  if ('error' in studioContext) return studioContext
  const { studioId } = studioContext

  const { data, error } = await buildGearSelectQuery(supabase, studioId)
    .eq('id', gearId)
    .maybeSingle()

  if (error) {
    if (error.message.includes('row-level security')) {
      return {
        error: 'NOT_A_MEMBER',
        message: 'You do not have permission to view this gear',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch gear: ${error.message}`,
    }
  }

  if (!data) {
    return {
      error: 'GEAR_NOT_FOUND',
      message: 'Gear not found',
    }
  }

  const [gear] = mapGearRows([data])

  return {
    success: true,
    gear,
  }
}

/**
 * Fetch distinct facet options for the current studio's gear.
 */
export async function getGearFacets(): Promise<
  { success: true; facets: GearFacetOptions } | GetGearError
> {
  const supabase = await getSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to view gear',
    }
  }

  const studioContext = await ensureStudioContext(supabase, user.id)
  if ('error' in studioContext) return studioContext
  const { data: gearTypes, error: typeError } = await supabase
    .from('gear_types')
    .select('id, name')
    .order('name', { ascending: true })

  if (typeError) {
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to fetch gear types: ${typeError.message}`,
    }
  }

  return {
    success: true,
    facets: {
      types: (gearTypes || []).map((gt) => ({
        id: gt.id,
        name: gt.name,
        icon_key: inferIconKey(gt.name, (gt as any)?.icon_key),
      })),
    },
  }
}

/**
 * Creates a new gear item in the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be an admin or owner
 * 
 * @param input - Gear creation data (brand and model required)
 * @returns Created gear or error object
 */
export async function createGear(
  input: CreateGearInput
): Promise<CreateGearResult | CreateGearError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to create gear',
    }
  }

  const brand = input.brand?.trim()
  const model = input.model?.trim()
  const rawQuantity = input.quantity
  const normalizedQuantity =
    rawQuantity === undefined || rawQuantity === null ? 1 : Number(rawQuantity)

  if (!brand || !model) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Brand and model are required',
    }
  }

  if (!Number.isFinite(normalizedQuantity) || !Number.isInteger(normalizedQuantity) || normalizedQuantity < 0) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Quantity must be a whole number of zero or more',
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
      message: 'Only admins and owners can create gear',
    }
  }

  // Build insert data, trimming whitespace
  const insertData = {
    studio_id: studioId,
    type_id: input.type_id?.trim() || null,
    brand,
    model,
    quantity: normalizedQuantity,
  }

  // Insert gear
  // RLS will ensure we can only insert gear for the current studio
  const { data: gear, error: insertError } = await supabase
    .from('gear')
    .insert(insertData)
    .select('*')
    .single()

  if (insertError) {
    // If error is RLS violation, user doesn't have permission
    if (insertError.message.includes('row-level security')) {
      return {
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to create gear in this studio',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to create gear: ${insertError.message}`,
    }
  }

  let type = null
  if (gear.type_id) {
    const { data: typeData } = await supabase
      .from('gear_types')
      .select('id, name')
      .eq('id', gear.type_id)
      .single()

    if (typeData) {
      type = { id: typeData.id, name: typeData.name, icon_key: inferIconKey(typeData.name, (typeData as any)?.icon_key) }
    }
  }

  return {
    success: true,
    gear: { ...gear, type } as Gear,
  }
}

/**
 * Updates a gear item in the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be an admin or owner
 * - Gear must belong to the current studio
 * 
 * @param gearId - The ID of the gear to update
 * @param input - Gear update data (type, brand, model, category)
 * @returns Updated gear or error object
 */
export async function updateGear(
  gearId: string,
  input: UpdateGearInput
): Promise<UpdateGearResult | UpdateGearError> {
  const supabase = await getSupabaseClient()

  // Validate gearId
  if (!gearId) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Gear ID is required',
    }
  }

  // Validate that at least one field is being updated
  if (
    input.type_id === undefined &&
    input.brand === undefined &&
    input.model === undefined &&
    input.quantity === undefined
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
      message: 'You must be logged in to update gear',
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
      message: 'Only admins and owners can update gear',
    }
  }

  // Build update object
  const updateData: {
    type_id?: string | null
    brand?: string | null
    model?: string | null
    quantity?: number
  } = {}
  
  if (input.type_id !== undefined) {
    updateData.type_id = input.type_id?.trim() || null
  }
  if (input.brand !== undefined) {
    updateData.brand = input.brand?.trim() || null
  }
  if (input.model !== undefined) {
    updateData.model = input.model?.trim() || null
  }
  if (input.quantity !== undefined) {
    if (input.quantity === null) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Quantity must be provided',
      }
    }

    const normalizedQuantity = Number(input.quantity)
    if (!Number.isFinite(normalizedQuantity) || !Number.isInteger(normalizedQuantity) || normalizedQuantity < 0) {
      return {
        error: 'VALIDATION_ERROR',
        message: 'Quantity must be a whole number of zero or more',
      }
    }

    updateData.quantity = normalizedQuantity
  }

  // Update gear
  // Must filter by both id and studio_id to prevent cross-studio access
  const { data: gear, error: updateError } = await supabase
    .from('gear')
    .update(updateData)
    .eq('id', gearId)
    .eq('studio_id', studioId)
    .select('*')
    .single()

  if (updateError) {
    // If error is "not found" (PGRST116), gear doesn't exist or doesn't belong to studio
    if (updateError.code === 'PGRST116' || updateError.message.includes('row-level security')) {
      return {
        error: 'GEAR_NOT_FOUND',
        message: 'Gear not found or you do not have permission to update it',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to update gear: ${updateError.message}`,
    }
  }

  if (!gear) {
    return {
      error: 'GEAR_NOT_FOUND',
      message: 'Gear not found',
    }
  }

  let type = null
  if (gear.type_id) {
    const { data: typeData } = await supabase
      .from('gear_types')
      .select('id, name')
      .eq('id', gear.type_id)
      .single()

    if (typeData) {
      type = { id: typeData.id, name: typeData.name, icon_key: inferIconKey(typeData.name, (typeData as any)?.icon_key) }
    }
  }

  return {
    success: true,
    gear: { ...gear, type } as Gear,
  }
}

/**
 * Deletes a gear item from the current studio.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be a member of the current studio
 * - User must be an admin or owner
 * - Gear must belong to the current studio
 * 
 * @param gearId - The ID of the gear to delete
 * @returns Success result or error object
 */
export async function deleteGear(
  gearId: string
): Promise<DeleteGearResult | DeleteGearError> {
  const supabase = await getSupabaseClient()

  // Validate gearId
  if (!gearId) {
    return {
      error: 'DATABASE_ERROR',
      message: 'Gear ID is required',
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
      message: 'You must be logged in to delete gear',
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
      message: 'Only admins and owners can delete gear',
    }
  }

  // Delete gear
  // Must filter by both id and studio_id to prevent cross-studio access
  const { error: deleteError } = await supabase
    .from('gear')
    .delete()
    .eq('id', gearId)
    .eq('studio_id', studioId)

  if (deleteError) {
    // If error is RLS violation, gear doesn't exist or user doesn't have permission
    if (deleteError.message.includes('row-level security')) {
      return {
        error: 'GEAR_NOT_FOUND',
        message: 'Gear not found or you do not have permission to delete it',
      }
    }
    return {
      error: 'DATABASE_ERROR',
      message: `Failed to delete gear: ${deleteError.message}`,
    }
  }

  return {
    success: true,
  }
}

