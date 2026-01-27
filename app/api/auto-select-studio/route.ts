import { redirect } from 'next/navigation'
import { autoSelectStudio } from '@/actions/switchStudio'
import { NextRequest } from 'next/server'

/**
 * Route Handler for Auto-Selecting Studio
 * 
 * This route handler auto-selects a studio for the user and redirects them.
 * Used when a user has studios but no studio is currently selected.
 */
export async function GET(request: NextRequest) {
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ FOUND' : '❌ MISSING')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ FOUND' : '❌ MISSING')
  // Get redirect path from query params (defaults to /dashboard)
  const searchParams = request.nextUrl.searchParams
  const redirectPath = searchParams.get('redirect') || '/dashboard'
  
  // Auto-select studio (this sets the cookie)
  const result = await autoSelectStudio()
  
  if ('error' in result) {
    // If auto-select fails, redirect anyway (user can select manually)
    console.warn('Failed to auto-select studio:', result.message)
    redirect(redirectPath)
  }
  
  // Redirect to the specified path (or dashboard)
  redirect(redirectPath)
}
