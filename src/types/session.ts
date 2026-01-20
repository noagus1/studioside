/**
 * Session Type Definitions
 * 
 * Extended session types with relations for application use.
 */

import type { SessionStatus } from './db'

// Session interface with relations
export interface Session {
  id: string
  studio_id: string
  room_id: string | null
  client_id: string | null
  engineer_id: string | null
  start_time: string
  end_time: string
  notes?: string | null
  /**
   * Alias for backward compatibility with legacy session resources.
   * Source of truth is session_gear via gear_items.
   */
  resources?: SessionGearItem[] | null
  gear_items?: SessionGearItem[] | null
  status: SessionStatus
  created_at: string
  updated_at: string
  // Optional relations for joined queries
  room?: {
    id: string
    name: string
  } | null
  client?: {
    id: string
    name: string
  } | null
  engineer?: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

export interface SessionGearItem {
  id: string
  gear_id: string
  quantity?: number | null
  note?: string | null
  gear?: {
    id: string
    brand: string | null
    model: string | null
    quantity?: number | null
    type?: {
      id: string
      name: string
      icon_key: string
    } | null
    category?: string | null
  } | null
}

// Legacy alias maintained for components that still reference SessionResource
export type SessionResource = SessionGearItem








