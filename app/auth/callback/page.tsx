import { Suspense } from 'react'
import { AuthCallbackHandler } from '@/components/AuthCallbackHandler'

/**
 * Auth Callback Page
 * 
 * Dedicated route for handling Supabase auth callbacks from email confirmation links.
 * This ensures callbacks work regardless of where the user clicks the link.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackHandler />
    </Suspense>
  )
}
