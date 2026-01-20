/**
 * Database Type Definitions
 * 
 * This file contains TypeScript types that map to the Supabase database schema.
 * These types are generated from the database migrations and can be extended
 * as needed for application logic.
 * 
 * Note: For production, consider using Supabase's type generation:
 * npx supabase gen types typescript --project-id <project-id> > src/types/db.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Timestamp = string

// Database enums
export type MembershipRole = 'owner' | 'admin' | 'member'
export type MembershipStatus = 'active' | 'pending' | 'removed'
export type InvitationStatus = 'pending' | 'accepted' | 'revoked'
export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'past_due' 
  | 'trialing' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'unpaid'
export type SessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'live'
  | 'completed'
  | 'finished'
  | 'cancelled'
  | 'no_show'
export type BillingStyle = 'hourly' | 'flat_session'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
export type GearStatus = 'available' | 'in_use' | 'maintenance' | 'missing'

// Database tables
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
  created_at: Timestamp
  updated_at: Timestamp
}

export interface Session {
  id: string
  studio_id: string
  room_id: string | null
  client_id: string | null
  engineer_id: string | null
  start_time: Timestamp
  end_time: Timestamp
  status: SessionStatus
  created_at: Timestamp
  updated_at: Timestamp
}

export interface Gear {
  id: string
  studio_id: string
  type_id: string | null
  brand: string | null
  model: string | null
  quantity: number
  created_at: Timestamp
  updated_at: Timestamp
  // Optional relation for joined queries
  type?: {
    id: string
    name: string
    icon_key: string
  } | null
}

export interface SessionGear {
  id: string
  session_id: string
  gear_id: string
  created_at: Timestamp
  updated_at: Timestamp
}

export interface Invoice {
  id: string
  studio_id: string
  client_id: string | null
  invoice_number: string
  status: InvoiceStatus
  currency: string
  issue_date: string
  due_date: string | null
  subtotal: number
  tax_total: number
  discount_total: number
  total: number
  memo: string | null
  notes: string | null
  payment_link_url: string | null
  pdf_url: string | null
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  metadata: Json
  customer_name: string | null
  customer_email: string | null
  sent_at: Timestamp | null
  paid_at: Timestamp | null
  created_by: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  name: string
  description: string | null
  quantity: number
  unit_amount: number
  tax_rate: number
  discount_amount: number
  sort_order: number
  created_at: Timestamp
  updated_at: Timestamp
}

