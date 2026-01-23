import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import AppSidebar from '@/components/AppSidebar'
import { CommandPaletteProvider } from '@/components/CommandPaletteProvider'
import { PasswordSetupModal } from '@/components/PasswordSetupModal'
import { getMembership } from '@/data/getMembership'
import { getUserProfile } from '@/data/getUserProfile'
import { CreateButtonHeader } from '@/components/CreateButtonHeader'
import { AppContentShell } from './AppContentShell'
import { resolveStudioAccess } from '@/lib/auth/resolveStudioAccess'
import NoStudiosState from './NoStudiosState'
import StudioPickerModal from './StudioPickerModal'

/**
 * Layout for Authenticated Routes
 * 
 * Wraps all pages in the (app) route group with the sidebar navigation.
 * Includes authentication check and redirects to login if not authenticated.
 * 
 * Note: Onboarding (full_name) is handled via pages. Studio creation is handled via modals on the dashboard.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await getSupabaseClient()
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true'

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const access = await resolveStudioAccess()
  if (access.state === 'no-studios') {
    return <NoStudiosState />
  }

  if (access.state === 'needs-picker') {
    return <StudioPickerModal studios={access.studios} />
  }

  // Fetch membership for role data
  let membership = null
  try {
    membership = await getMembership()
  } catch (error) {
    // If membership fetch fails, continue without role
    console.warn('Failed to fetch membership:', error)
  }

  // Fetch user profile for settings modal
  let userProfile = null
  try {
    userProfile = await getUserProfile()
  } catch (error) {
    // If profile fetch fails, continue without profile
    console.warn('Failed to fetch user profile:', error)
  }

  return (
    <CommandPaletteProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="flex min-h-svh w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b bg-background px-4">
              <div className="flex flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
              </div>
              <div className="flex items-center gap-2.5">
                <CreateButtonHeader />
              </div>
            </header>
            <AppContentShell>{children}</AppContentShell>
          </div>
        </div>
      </SidebarProvider>
      <PasswordSetupModal />
    </CommandPaletteProvider>
  )
}

