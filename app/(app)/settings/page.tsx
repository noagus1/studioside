import { redirect } from 'next/navigation'

// Force dynamic rendering to prevent caching issues with role detection
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Settings Page (Default)
 * 
 * Redirects to personal account settings by default to avoid dropping users
 * straight into studio configuration.
 */
export default function SettingsPage() {
  redirect('/account/profile')
}
