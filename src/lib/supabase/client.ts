/**
 * Supabase Client-Side Client
 * 
 * Browser client for authentication and client-side operations.
 * This client is used in Client Components for user authentication.
 * 
 * ⚠️ This client respects Row Level Security (RLS) policies.
 * ⚠️ Only use this in Client Components ('use client').
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Singleton instance to prevent multiple GoTrueClient instances
let supabaseClient: SupabaseClient | null = null

/**
 * Browser Supabase client for client-side operations.
 * 
 * Uses a singleton pattern to prevent multiple GoTrueClient instances.
 * 
 * This client is configured with:
 * - Session persistence enabled (stores auth in localStorage)
 * - Auto token refresh enabled
 * - Respects RLS policies
 * 
 * Usage in Client Components:
 * ```tsx
 * 'use client'
 * import { getSupabaseClient } from '@/lib/supabase/client'
 * 
 * const supabase = getSupabaseClient()
 * if (supabase) {
 *   const { data } = await supabase.auth.signInWithPassword({ email, password })
 * }
 * ```
 * 
 * @returns Supabase client instance, or null if environment variables are missing
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null
  }

  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient
  }

  // Create new client instance
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return supabaseClient
}

