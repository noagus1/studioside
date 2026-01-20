import { redirect } from 'next/navigation'
import { getUserStudios } from '@/data/getUserStudios'
import WelcomePageClient from './WelcomePageClient'

/**
 * Welcome Page
 * 
 * Full-page view for users without studios to create or join a studio.
 * Redirects to dashboard if user already has studios.
 */
export default async function WelcomePage() {
  const studios = await getUserStudios()

  // If user already has studios, redirect to dashboard
  if (studios.length > 0) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <WelcomePageClient />
      </div>
    </div>
  )
}
