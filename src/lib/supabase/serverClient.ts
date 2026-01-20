/**
 * Supabase Server Client
 * 
 * Creates a per-request Supabase client that injects the current_studio_id
 * from cookies into the PostgreSQL session for RLS policies.
 * 
 * This client MUST only be used in Server Components, Server Actions, and Route Handlers.
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

/**
 * Creates a Supabase server client with current_studio_id injected from cookies.
 * 
 * This function should be called in Server Components, Server Actions, or Route Handlers.
 * It reads the current_studio_id cookie and sets it in the PostgreSQL session
 * so that RLS policies can access it via current_studio_id().
 * 
 * The studio ID is set by calling the set_current_studio_id() database function
 * on the first query. This ensures RLS policies have access to the current studio.
 * 
 * @returns Supabase client instance with studio context
 */
export async function createSupabaseServerClient() {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error('createSupabaseServerClient() can only be used server-side')
  }

  const cookieStore = cookies()
  const studioId = cookieStore.get('current_studio_id')?.value ?? null

  // Get auth tokens from cookies
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value

  // Create client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  // Set session explicitly if tokens are available
  // This is required for RLS policies to access auth.uid()
  // Setting headers alone works for getUser() but not for RLS
  if (accessToken && refreshToken) {
    try {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    } catch (error) {
      // If setSession fails, log but continue
      // The client will still work, but RLS may be more restrictive
      console.warn('Failed to set session in Supabase client:', error)
    }
  }

  // Set the studio ID in PostgreSQL session for RLS policies
  // This must be done before any queries that rely on current_studio_id()
  if (studioId) {
    try {
      const { error: rpcError } = await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
      if (rpcError) {
        // Check if it's a 404 (function doesn't exist) vs other errors
        if (rpcError.code === 'PGRST202' || rpcError.message?.includes('404')) {
          console.warn(
            'set_current_studio_id RPC function not found. ' +
            'Please run migration 006_utils_current_studio.sql to create this function.'
          )
        } else {
          console.warn('Failed to set current_studio_id in session:', rpcError.message)
        }
      }
    } catch (error) {
      // If the function call fails, log but don't throw
      // This allows the client to still be used, though RLS may be more restrictive
      console.warn('Failed to set current_studio_id in session:', error)
    }
  }

  return supabase
}

/**
 * Synchronous version that returns a client without setting studio ID.
 * Use this when you need a client immediately and will set the studio ID later,
 * or when the studio ID is not needed for the operation.
 * 
 * @returns Supabase client instance
 */
export function createSupabaseServerClientSync() {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error('createSupabaseServerClientSync() can only be used server-side')
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Helper to get a Supabase client with studio context set.
 * This is the recommended way to get a client in Server Actions.
 * 
 * Usage:
 * ```ts
 * const supabase = await getSupabaseClient()
 * const { data } = await supabase.from('studios').select()
 * ```
 */
export async function getSupabaseClient() {
  return createSupabaseServerClient()
}

/**
 * Note: There is no default export because the client creation is async.
 * Always use getSupabaseClient() or createSupabaseServerClient() directly.
 * 
 * Example usage:
 * ```ts
 * import { getSupabaseClient } from '@/lib/supabase/serverClient'
 * 
 * export async function myServerAction() {
 *   const supabase = await getSupabaseClient()
 *   const { data } = await supabase.from('studios').select()
 * }
 * ```
 */
