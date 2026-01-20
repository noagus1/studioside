/**
 * Membership Type Definitions
 * 
 * TypeScript interfaces for studio membership data structures.
 */

import type { Timestamp, MembershipRole, MembershipStatus } from './db'

/**
 * Studio membership entity from the database.
 */
export interface Membership {
  id: string
  studio_id: string
  user_id: string
  role: MembershipRole
  status: MembershipStatus
  joined_at: Timestamp
  created_at: Timestamp
  updated_at: Timestamp
}

/**
 * Membership with user profile information.
 */
export interface MembershipWithUser extends Membership {
  user: {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

/**
 * Membership with studio information.
 */
export interface MembershipWithStudio extends Membership {
  studio: {
    id: string
    name: string
    slug: string
    logo_url: string | null
  }
}

/**
 * Create membership input (for acceptInvite action).
 */
export interface CreateMembershipInput {
  studio_id: string
  user_id: string
  role: MembershipRole
}

/**
 * Update membership input (for updateMembership action).
 */
export interface UpdateMembershipInput {
  role?: MembershipRole
}

