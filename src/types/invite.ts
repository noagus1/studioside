/**
 * Invitation Type Definitions
 * 
 * TypeScript interfaces for studio invitation data structures.
 */

import type { Timestamp, MembershipRole, InvitationStatus } from './db'

/**
 * Studio invitation entity from the database.
 */
export interface Invitation {
  id: string
  studio_id: string
  invited_by: string
  email: string
  token_hash: string
  role: MembershipRole
  status: InvitationStatus
  expires_at: Timestamp
  accepted_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
}

/**
 * Invitation with studio information.
 */
export interface InvitationWithStudio extends Invitation {
  studio: {
    id: string
    name: string
    slug: string
    logo_url: string | null
  }
}

/**
 * Invitation with inviter information.
 */
export interface InvitationWithInviter extends Invitation {
  inviter: {
    id: string
    email: string | null
    full_name: string | null
  }
}

export type InviteSource = 'invitation' | 'invite_link'

export interface InviteContext {
  source: InviteSource
  role: MembershipRole
  studio: {
    id: string
    name: string
    slug: string
    logo_url: string | null
  }
  email?: string
  invitation?: Invitation
  expires_at?: Timestamp | null
}

/**
 * Create invitation input (for createInvite action).
 */
export interface CreateInviteInput {
  studio_id: string
  email: string
  role?: MembershipRole
  expires_in_hours?: number // Default: 168 (7 days)
}

/**
 * Validate invitation token result.
 */
export interface ValidateInviteResult {
  id: string
  studio_id: string
  email: string
  role: MembershipRole
  expires_at: Timestamp
}

