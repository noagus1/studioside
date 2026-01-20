import { getUserProfile } from '@/data/getUserProfile'
import { getMembership } from '@/data/getMembership'
import AccountPopoverHeader from './AccountPopoverHeader'

/**
 * Account Popover Header Sidebar Wrapper
 * 
 * Server component wrapper for AccountPopoverHeader that fetches user data.
 * This allows the server component to be properly rendered in the header context.
 */
export default async function AccountPopoverHeaderSidebar() {
  // Fetch user profile - this is required
  const user = await getUserProfile()
  
  if (!user) {
    return null
  }

  // Fetch membership - this can fail during studio switches, so handle gracefully
  let membership = null
  try {
    membership = await getMembership()
  } catch (error) {
    // If membership fetch fails (e.g., during studio switch), continue without role
    // The account menu should still be visible
    console.warn('Failed to fetch membership:', error)
  }

  return <AccountPopoverHeader user={user} role={membership?.role || null} />
}
