/**
 * Supabase Admin Client
 * 
 * Service role client that bypasses RLS.
 * Use for:
 * - Stripe webhooks
 * - Cron jobs
 * - Admin operations
 * - System-level tasks
 * 
 * ⚠️ NEVER expose this client to the client-side.
 * ⚠️ NEVER use this for regular user operations.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase admin environment variables')
}

/**
 * Admin Supabase client with service role key.
 * 
 * This client bypasses Row Level Security (RLS) and should only be used
 * in secure server-side contexts like API routes, webhooks, and cron jobs.
 * 
 * @returns Supabase admin client instance
 */
export const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

