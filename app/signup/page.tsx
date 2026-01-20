import { redirect } from 'next/navigation'

/**
 * Signup Page
 * 
 * Redirects to /login since we now use a unified auth flow.
 */
export default async function SignupPage() {
  redirect('/login')
}

