import { getUserProfile } from '@/data/getUserProfile'
import { getMembership } from '@/data/getMembership'
import AppSidebarClient from './AppSidebarClient'

/**
 * Server wrapper that fetches user + membership and renders the client sidebar.
 */
export default async function AppSidebar() {
  const user = await getUserProfile()

  let membership = null
  try {
    membership = await getMembership()
  } catch (error) {
    console.warn('Failed to fetch membership:', error)
  }

  if (!user) {
    return null
  }

  return (
    <AppSidebarClient
      user={user}
      role={membership?.role ?? null}
    />
  )
}

