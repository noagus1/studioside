'use server'

import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { clearCurrentStudioId } from '@/lib/cookies/currentStudio'

/**
 * Logout Action
 * 
 * Signs out the current user and redirects to the login page.
 * Clears the current studio cookie to prevent stale state.
 */
export async function logout() {
  const supabase = await getSupabaseClient()
  
  // Clear current studio cookie before signing out
  await clearCurrentStudioId()
  
  await supabase.auth.signOut()
  
  redirect('/login')
}

