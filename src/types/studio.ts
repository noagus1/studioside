/**
 * Studio Type Definitions
 * 
 * TypeScript interfaces for studio-related data structures.
 */

import type { Timestamp } from './db'

export type BillingStyle = 'hourly' | 'flat_session'

/**
 * Studio entity from the database.
 */
export interface Studio {
  id: string
  name: string
  slug: string
  owner_id: string
  logo_url: string | null
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  street: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  timezone: string | null
  default_buffer_minutes: number | null
  default_session_length_hours: number | null
  default_overtime_rate: number | null
  overtime_rules: string | null
  billing_style: BillingStyle | null
  base_rate: number | null
  created_at: Timestamp
  updated_at: Timestamp
}

/**
 * Studio with additional computed fields.
 */
export interface StudioWithDetails extends Studio {
  member_count?: number
  owner_name?: string
  is_current?: boolean
}

/**
 * Studio creation input (for createStudio action).
 * 
 * Note: slug is auto-generated from name, so it's not required in the input.
 */
export interface CreateStudioInput {
  name: string
  description?: string
  logo_url?: string
  // slug is auto-generated from name, but can be optionally provided for custom slugs
  slug?: string
}

/**
 * Studio update input (for updateStudio action).
 */
export interface UpdateStudioInput {
  name?: string
  slug?: string
  description?: string | null
  logo_url?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  street?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  timezone?: string
  default_buffer_minutes?: number
  default_session_length_hours?: number
  default_overtime_rate?: number | null
  overtime_rules?: string | null
  billing_style?: BillingStyle | null
  base_rate?: number | null
}

